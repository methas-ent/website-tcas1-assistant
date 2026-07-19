import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import type { MobileQuestionThread } from "@knowledge/shared";
import {
  createStudentLessonQuestion,
  getStudentLessonQuestionThreadSnapshot,
  markStudentLessonQuestionThreadRead,
} from "@/lib/lesson-questions";
import { requireMobileStudent } from "@/lib/mobile-api";
import { canStudentAccessLesson } from "@/lib/student-learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { lessonId: string } };

function getLessonId(params: Params["params"]) {
  return params.lessonId?.trim() ?? "";
}

type ThreadSnapshot = NonNullable<
  Awaited<ReturnType<typeof getStudentLessonQuestionThreadSnapshot>>
>;

function serializeThread(thread: ThreadSnapshot): MobileQuestionThread {
  return {
    id: thread.id,
    status: thread.status,
    unreadForStudent: thread.unreadForStudent,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    messages: thread.messages.map((message) => ({
      id: message.id,
      senderRole: message.senderRole,
      senderName: message.sender?.name ?? null,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

/** GET the student's question thread for a lesson (null if not started yet). */
export async function GET(request: NextRequest, { params }: Params) {
  const lessonId = getLessonId(params);

  if (!lessonId) {
    return NextResponse.json({ error: "MISSING_LESSON_ID" }, { status: 400 });
  }

  const auth = await requireMobileStudent(request);

  if (!auth.ok) {
    return auth.response;
  }

  const lesson = await canStudentAccessLesson(auth.user.id, lessonId);

  if (!lesson) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "You do not have access to this lesson" },
      { status: 403 },
    );
  }

  const thread = await getStudentLessonQuestionThreadSnapshot(
    auth.user.id,
    lessonId,
  );

  return NextResponse.json({
    thread: thread ? serializeThread(thread) : null,
  });
}

/** POST a new question message from the student. */
export async function POST(request: NextRequest, { params }: Params) {
  const lessonId = getLessonId(params);

  if (!lessonId) {
    return NextResponse.json({ error: "MISSING_LESSON_ID" }, { status: 400 });
  }

  const auth = await requireMobileStudent(request);

  if (!auth.ok) {
    return auth.response;
  }

  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const body =
    payload && typeof payload === "object" && "body" in payload
      ? String((payload as { body: unknown }).body ?? "")
      : "";

  // userId always comes from the authenticated session — never from the body.
  const result = await createStudentLessonQuestion({
    userId: auth.user.id,
    lessonId,
    body,
  });

  if (!result.ok) {
    if (result.error === "forbidden") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You do not have access to this lesson" },
        { status: 403 },
      );
    }

    if (result.error === "message-too-long") {
      return NextResponse.json(
        { error: "MESSAGE_TOO_LONG", message: "Message is too long" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "MESSAGE_REQUIRED", message: "Message is required" },
      { status: 400 },
    );
  }

  // Keep the admin web inbox fresh (no-op if that route is not present).
  revalidatePath("/admin/inbox");

  const thread = await getStudentLessonQuestionThreadSnapshot(
    auth.user.id,
    lessonId,
  );

  return NextResponse.json(
    { thread: thread ? serializeThread(thread) : null },
    { status: 201 },
  );
}

/** PATCH marks the current student's thread for this lesson as read. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const lessonId = getLessonId(params);

  if (!lessonId) {
    return NextResponse.json({ error: "MISSING_LESSON_ID" }, { status: 400 });
  }

  const auth = await requireMobileStudent(request);

  if (!auth.ok) {
    return auth.response;
  }

  const lesson = await canStudentAccessLesson(auth.user.id, lessonId);

  if (!lesson) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "You do not have access to this lesson" },
      { status: 403 },
    );
  }

  await markStudentLessonQuestionThreadRead(auth.user.id, lessonId);

  return NextResponse.json({ ok: true });
}
