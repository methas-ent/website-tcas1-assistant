import { beforeEach, describe, expect, it, vi } from "vitest";

// Only Prisma (the external boundary) is mocked. canStudentAccessLesson and
// createStudentLessonQuestion run for real.
vi.mock("@/lib/db", () => ({
  default: {
    lesson: { findFirst: vi.fn() },
    lessonQuestionThread: { upsert: vi.fn() },
    lessonQuestionMessage: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import prisma from "@/lib/db";
import {
  LESSON_QUESTION_MAX_LENGTH,
  createStudentLessonQuestion,
  normalizeQuestionBody,
} from "@/lib/lesson-questions";

type AnyMock = ReturnType<typeof vi.fn>;
const lessonFindFirst = prisma.lesson.findFirst as unknown as AnyMock;
const threadUpsert = prisma.lessonQuestionThread.upsert as unknown as AnyMock;
const messageCreate = prisma.lessonQuestionMessage.create as unknown as AnyMock;
const transaction = prisma.$transaction as unknown as AnyMock;

const LESSON = { id: "l1", courseId: "co1" };

function wireTransaction() {
  // Run the callback with a tx double exposing the same delegate methods.
  transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn({
      lessonQuestionThread: { upsert: threadUpsert },
      lessonQuestionMessage: { create: messageCreate },
    }),
  );
  threadUpsert.mockResolvedValue({ id: "t1" });
  messageCreate.mockResolvedValue({ id: "m1" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("normalizeQuestionBody", () => {
  it("trims only — it does NOT truncate long input", () => {
    const long = "a".repeat(2500);
    expect(normalizeQuestionBody(`  ${long}  `)).toHaveLength(2500);
  });

  it("collapses trailing whitespace before newlines and trims ends", () => {
    expect(normalizeQuestionBody("  hi \nthere  ")).toBe("hi\nthere");
  });
});

describe("createStudentLessonQuestion", () => {
  it("rejects when the student has no lesson access (no DB write)", async () => {
    lessonFindFirst.mockResolvedValueOnce(null);

    const result = await createStudentLessonQuestion({
      userId: "u1",
      lessonId: "l1",
      body: "hello",
    });

    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(transaction).not.toHaveBeenCalled();
    expect(threadUpsert).not.toHaveBeenCalled();
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it("rejects an empty/whitespace body with message-required (no DB write)", async () => {
    lessonFindFirst.mockResolvedValueOnce(LESSON);

    const result = await createStudentLessonQuestion({
      userId: "u1",
      lessonId: "l1",
      body: "   \n  ",
    });

    expect(result).toEqual({ ok: false, error: "message-required" });
    expect(transaction).not.toHaveBeenCalled();
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it("rejects an over-long body with message-too-long (no DB write, no truncation)", async () => {
    lessonFindFirst.mockResolvedValueOnce(LESSON);

    const result = await createStudentLessonQuestion({
      userId: "u1",
      lessonId: "l1",
      body: "a".repeat(LESSON_QUESTION_MAX_LENGTH + 1),
    });

    expect(result).toEqual({ ok: false, error: "message-too-long" });
    expect(transaction).not.toHaveBeenCalled();
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it("accepts a body exactly at the limit and creates the message", async () => {
    lessonFindFirst.mockResolvedValueOnce(LESSON);
    wireTransaction();

    const result = await createStudentLessonQuestion({
      userId: "u1",
      lessonId: "l1",
      body: "a".repeat(LESSON_QUESTION_MAX_LENGTH),
    });

    expect(result).toEqual({ ok: true, threadId: "t1" });
    expect(threadUpsert).toHaveBeenCalledTimes(1);
    expect(messageCreate).toHaveBeenCalledTimes(1);
    expect(messageCreate.mock.calls[0][0].data).toMatchObject({
      threadId: "t1",
      senderId: "u1",
      senderRole: "STUDENT",
    });
  });

  it("always sends with the session userId as sender (never client-supplied)", async () => {
    lessonFindFirst.mockResolvedValueOnce(LESSON);
    wireTransaction();

    await createStudentLessonQuestion({
      userId: "u1",
      lessonId: "l1",
      body: "why is this like this?",
    });

    // senderId is the authenticated userId passed in, and the thread is keyed by
    // (lessonId, userId) via upsert — a student can never write another's thread.
    expect(messageCreate.mock.calls[0][0].data.senderId).toBe("u1");
    expect(threadUpsert.mock.calls[0][0].where).toEqual({
      lessonId_userId: { lessonId: "l1", userId: "u1" },
    });
  });
});
