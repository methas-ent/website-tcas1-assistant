import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the boundaries so the route logic (auth gating, access gating, status
// mapping, serialization) is what's under test.
vi.mock("@/lib/mobile-api", () => ({
  requireMobileStudent: vi.fn(),
}));
vi.mock("@/lib/student-learning", () => ({
  canStudentAccessLesson: vi.fn(),
}));
vi.mock("@/lib/lesson-questions", () => ({
  createStudentLessonQuestion: vi.fn(),
  getStudentLessonQuestionThreadSnapshot: vi.fn(),
  markStudentLessonQuestionThreadRead: vi.fn(),
  getStudentLessonQuestionInbox: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { requireMobileStudent } from "@/lib/mobile-api";
import { canStudentAccessLesson } from "@/lib/student-learning";
import {
  createStudentLessonQuestion,
  getStudentLessonQuestionInbox,
  getStudentLessonQuestionThreadSnapshot,
  markStudentLessonQuestionThreadRead,
} from "@/lib/lesson-questions";
import { revalidatePath } from "next/cache";
import {
  GET as threadGET,
  PATCH as threadPATCH,
  POST as threadPOST,
} from "@/app/api/mobile/lessons/[lessonId]/question-thread/route";
import { GET as inboxGET } from "@/app/api/mobile/inbox/route";

type AnyMock = ReturnType<typeof vi.fn>;
const requireAuth = requireMobileStudent as unknown as AnyMock;
const canAccess = canStudentAccessLesson as unknown as AnyMock;
const createQuestion = createStudentLessonQuestion as unknown as AnyMock;
const getSnapshot = getStudentLessonQuestionThreadSnapshot as unknown as AnyMock;
const markRead = markStudentLessonQuestionThreadRead as unknown as AnyMock;
const getInbox = getStudentLessonQuestionInbox as unknown as AnyMock;
const revalidate = revalidatePath as unknown as AnyMock;

const PARAMS = { params: { lessonId: "l1" } };
const AUTH_OK = { ok: true, user: { id: "u1", role: "STUDENT" } };

function unauthorized() {
  return {
    ok: false,
    response: NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
  };
}

function jsonRequest(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof threadPOST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET question-thread", () => {
  it("returns 401 when unauthenticated", async () => {
    requireAuth.mockResolvedValueOnce(unauthorized());
    const res = await threadGET({} as never, PARAMS);
    expect(res.status).toBe(401);
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it("returns 403 when the student has no lesson access", async () => {
    requireAuth.mockResolvedValueOnce(AUTH_OK);
    canAccess.mockResolvedValueOnce(null);
    const res = await threadGET({} as never, PARAMS);
    expect(res.status).toBe(403);
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it("returns thread: null when no thread exists yet", async () => {
    requireAuth.mockResolvedValueOnce(AUTH_OK);
    canAccess.mockResolvedValueOnce({ id: "l1", courseId: "co1" });
    getSnapshot.mockResolvedValueOnce(null);
    const res = await threadGET({} as never, PARAMS);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ thread: null });
  });

  it("serializes the thread (dates to ISO strings)", async () => {
    requireAuth.mockResolvedValueOnce(AUTH_OK);
    canAccess.mockResolvedValueOnce({ id: "l1", courseId: "co1" });
    getSnapshot.mockResolvedValueOnce({
      id: "t1",
      status: "OPEN",
      unreadForStudent: false,
      lastMessageAt: new Date("2026-07-11T00:00:00.000Z"),
      messages: [
        {
          id: "m1",
          senderRole: "STUDENT",
          body: "hi",
          createdAt: new Date("2026-07-11T00:00:00.000Z"),
          sender: { name: "Stu" },
        },
      ],
    });
    const res = await threadGET({} as never, PARAMS);
    const data = await res.json();
    expect(data.thread.messages[0]).toEqual({
      id: "m1",
      senderRole: "STUDENT",
      senderName: "Stu",
      body: "hi",
      createdAt: "2026-07-11T00:00:00.000Z",
    });
  });
});

describe("POST question-thread", () => {
  it("returns 401 when unauthenticated (no question created)", async () => {
    requireAuth.mockResolvedValueOnce(unauthorized());
    const res = await threadPOST(jsonRequest({ body: "hi" }), PARAMS);
    expect(res.status).toBe(401);
    expect(createQuestion).not.toHaveBeenCalled();
  });

  it("passes the authenticated userId (never client input) to the core", async () => {
    requireAuth.mockResolvedValueOnce(AUTH_OK);
    createQuestion.mockResolvedValueOnce({ ok: true, threadId: "t1" });
    getSnapshot.mockResolvedValueOnce(null);
    await threadPOST(jsonRequest({ body: "hi", userId: "attacker" }), PARAMS);
    expect(createQuestion).toHaveBeenCalledWith({
      userId: "u1",
      lessonId: "l1",
      body: "hi",
    });
  });

  it("maps forbidden -> 403", async () => {
    requireAuth.mockResolvedValueOnce(AUTH_OK);
    createQuestion.mockResolvedValueOnce({ ok: false, error: "forbidden" });
    const res = await threadPOST(jsonRequest({ body: "hi" }), PARAMS);
    expect(res.status).toBe(403);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("maps message-required -> 400 MESSAGE_REQUIRED", async () => {
    requireAuth.mockResolvedValueOnce(AUTH_OK);
    createQuestion.mockResolvedValueOnce({ ok: false, error: "message-required" });
    const res = await threadPOST(jsonRequest({ body: "" }), PARAMS);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("MESSAGE_REQUIRED");
  });

  it("maps message-too-long -> 400 MESSAGE_TOO_LONG", async () => {
    requireAuth.mockResolvedValueOnce(AUTH_OK);
    createQuestion.mockResolvedValueOnce({ ok: false, error: "message-too-long" });
    const res = await threadPOST(jsonRequest({ body: "x" }), PARAMS);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("MESSAGE_TOO_LONG");
  });

  it("returns 201 and revalidates the admin inbox on success", async () => {
    requireAuth.mockResolvedValueOnce(AUTH_OK);
    createQuestion.mockResolvedValueOnce({ ok: true, threadId: "t1" });
    getSnapshot.mockResolvedValueOnce({
      id: "t1",
      status: "OPEN",
      unreadForStudent: false,
      lastMessageAt: new Date("2026-07-11T00:00:00.000Z"),
      messages: [],
    });
    const res = await threadPOST(jsonRequest({ body: "hi" }), PARAMS);
    expect(res.status).toBe(201);
    expect(revalidate).toHaveBeenCalledWith("/admin/inbox");
  });
});

describe("PATCH question-thread (mark read)", () => {
  it("returns 401 when unauthenticated", async () => {
    requireAuth.mockResolvedValueOnce(unauthorized());
    const res = await threadPATCH({} as never, PARAMS);
    expect(res.status).toBe(401);
    expect(markRead).not.toHaveBeenCalled();
  });

  it("returns 403 without access (no mark-read)", async () => {
    requireAuth.mockResolvedValueOnce(AUTH_OK);
    canAccess.mockResolvedValueOnce(null);
    const res = await threadPATCH({} as never, PARAMS);
    expect(res.status).toBe(403);
    expect(markRead).not.toHaveBeenCalled();
  });

  it("marks read for the current student's lesson thread", async () => {
    requireAuth.mockResolvedValueOnce(AUTH_OK);
    canAccess.mockResolvedValueOnce({ id: "l1", courseId: "co1" });
    markRead.mockResolvedValueOnce({ id: "t1" });
    const res = await threadPATCH({} as never, PARAMS);
    expect(res.status).toBe(200);
    expect(markRead).toHaveBeenCalledWith("u1", "l1");
  });
});

describe("GET inbox", () => {
  it("returns 401 when unauthenticated", async () => {
    requireAuth.mockResolvedValueOnce(unauthorized());
    const res = await inboxGET({} as never);
    expect(res.status).toBe(401);
    expect(getInbox).not.toHaveBeenCalled();
  });

  it("maps threads to inbox items scoped to the authenticated user", async () => {
    requireAuth.mockResolvedValueOnce(AUTH_OK);
    getInbox.mockResolvedValueOnce([
      {
        id: "t1",
        status: "ANSWERED",
        unreadForStudent: true,
        lastMessageAt: new Date("2026-07-11T00:00:00.000Z"),
        _count: { messages: 3 },
        messages: [
          {
            body: "answer",
            senderRole: "ADMIN",
            createdAt: new Date("2026-07-11T00:00:00.000Z"),
          },
        ],
        lesson: {
          id: "l1",
          epNumber: 2,
          title: "Ep title",
          course: { title: "Course", coverImageUrl: null },
        },
      },
    ]);
    const res = await inboxGET({} as never);
    const data = await res.json();
    expect(getInbox).toHaveBeenCalledWith("u1");
    expect(data.inbox[0]).toEqual({
      id: "t1",
      status: "ANSWERED",
      unreadForStudent: true,
      lastMessageAt: "2026-07-11T00:00:00.000Z",
      messageCount: 3,
      lastMessage: {
        body: "answer",
        senderRole: "ADMIN",
        createdAt: "2026-07-11T00:00:00.000Z",
      },
      lesson: { id: "l1", epNumber: 2, title: "Ep title" },
      course: { title: "Course", coverImageUrl: null },
    });
  });
});
