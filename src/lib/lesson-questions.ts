import prisma from "@/lib/db";
import { canStudentAccessLesson } from "@/lib/student-learning";

/** Maximum length of a single lesson-question message body. */
export const LESSON_QUESTION_MAX_LENGTH = 2000;

export function getLessonQuestionErrorMessage(error?: string) {
  const messages: Record<string, string> = {
    "message-required": "Please enter a message before sending.",
    "message-too-long": "Message is too long.",
    "thread-not-found": "Question thread not found.",
    forbidden: "You do not have access to this lesson.",
  };

  return error ? messages[error] ?? "Could not send the message." : null;
}

export type SendLessonQuestionResult =
  | { ok: true; threadId: string }
  | { ok: false; error: "forbidden" | "message-required" | "message-too-long" };

/**
 * Normalize a lesson-question body: collapse trailing whitespace-before-newline
 * and trim the ends. This does NOT truncate — length is validated separately so
 * an over-long message is rejected explicitly rather than silently cut.
 */
export function normalizeQuestionBody(value: string) {
  return value.replace(/\s+\n/g, "\n").trim();
}

/**
 * Core business logic for a student posting a lesson question.
 *
 * Guarantees:
 * - access is verified via `canStudentAccessLesson` (userId always comes from the
 *   authenticated session — never from client input);
 * - an empty body is rejected as `message-required` and an over-long body as
 *   `message-too-long`, both BEFORE any database write;
 * - the (lesson, user) thread is upserted so a student can only ever own one
 *   thread per lesson (`@@unique([lessonId, userId])`).
 */
export async function createStudentLessonQuestion(input: {
  userId: string;
  lessonId: string;
  body: string;
}): Promise<SendLessonQuestionResult> {
  const lesson = await canStudentAccessLesson(input.userId, input.lessonId);

  if (!lesson) {
    return { ok: false, error: "forbidden" };
  }

  const body = normalizeQuestionBody(input.body);

  if (!body) {
    return { ok: false, error: "message-required" };
  }

  if (body.length > LESSON_QUESTION_MAX_LENGTH) {
    return { ok: false, error: "message-too-long" };
  }

  const thread = await prisma.$transaction(async (tx) => {
    const upserted = await tx.lessonQuestionThread.upsert({
      where: {
        lessonId_userId: {
          lessonId: input.lessonId,
          userId: input.userId,
        },
      },
      create: {
        lessonId: input.lessonId,
        userId: input.userId,
        status: "OPEN",
        unreadForAdmin: true,
        unreadForStudent: false,
        lastMessageAt: new Date(),
      },
      update: {
        status: "OPEN",
        unreadForAdmin: true,
        unreadForStudent: false,
        lastMessageAt: new Date(),
      },
      select: { id: true },
    });

    await tx.lessonQuestionMessage.create({
      data: {
        threadId: upserted.id,
        senderId: input.userId,
        senderRole: "STUDENT",
        body,
      },
    });

    return upserted;
  });

  return { ok: true, threadId: thread.id };
}

export async function getStudentLessonQuestionThread(
  userId: string,
  lessonId: string,
) {
  return getStudentLessonQuestionThreadSnapshot(userId, lessonId);
}

/**
 * The student's thread for a lesson, or null. Access is re-checked and the
 * thread is looked up by the composite (lessonId, userId) key, so a student can
 * only ever read their own thread — never another user's.
 */
export async function getStudentLessonQuestionThreadSnapshot(
  userId: string,
  lessonId: string,
) {
  const lesson = await canStudentAccessLesson(userId, lessonId);

  if (!lesson) {
    return null;
  }

  const thread = await prisma.lessonQuestionThread.findUnique({
    where: {
      lessonId_userId: {
        lessonId,
        userId,
      },
    },
    select: {
      id: true,
      status: true,
      unreadForStudent: true,
      lastMessageAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderRole: true,
          body: true,
          createdAt: true,
          sender: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return thread;
}

/**
 * Mark the current student's thread for a lesson as read. Scoped by
 * (lessonId, userId) so a student can never mark another user's thread read.
 */
export async function markStudentLessonQuestionThreadRead(
  userId: string,
  lessonId: string,
) {
  const lesson = await canStudentAccessLesson(userId, lessonId);

  if (!lesson) {
    return null;
  }

  const thread = await prisma.lessonQuestionThread.findUnique({
    where: {
      lessonId_userId: {
        lessonId,
        userId,
      },
    },
    select: { id: true },
  });

  if (!thread) {
    return null;
  }

  await prisma.lessonQuestionThread.update({
    where: { id: thread.id },
    data: { unreadForStudent: false },
  });

  return { id: thread.id };
}

/**
 * The student's lesson-question inbox (one entry per owned thread, newest
 * first). Always filtered by `userId` from the authenticated session.
 */
export async function getStudentLessonQuestionInbox(userId: string) {
  return prisma.lessonQuestionThread.findMany({
    where: { userId },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      unreadForStudent: true,
      lastMessageAt: true,
      lesson: {
        select: {
          id: true,
          title: true,
          epNumber: true,
          course: {
            select: {
              title: true,
              coverImageUrl: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          body: true,
          createdAt: true,
          senderRole: true,
        },
      },
      _count: {
        select: { messages: true },
      },
    },
  });
}
