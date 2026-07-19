import { NextResponse, type NextRequest } from "next/server";
import type { MobileInboxItem } from "@knowledge/shared";
import { getStudentLessonQuestionInbox } from "@/lib/lesson-questions";
import { requireMobileStudent } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Student lesson-question inbox for the mobile Chat tab. One entry per
 * LessonQuestionThread the authenticated student owns, newest first, with the
 * latest message preview and unread flag.
 */
export async function GET(request: NextRequest) {
  const auth = await requireMobileStudent(request);

  if (!auth.ok) {
    return auth.response;
  }

  const threads = await getStudentLessonQuestionInbox(auth.user.id);

  const items: MobileInboxItem[] = threads.map((thread) => {
    const latest = thread.messages[0];

    return {
      id: thread.id,
      status: thread.status,
      unreadForStudent: thread.unreadForStudent,
      lastMessageAt: thread.lastMessageAt.toISOString(),
      messageCount: thread._count.messages,
      lastMessage: latest
        ? {
            body: latest.body,
            senderRole: latest.senderRole,
            createdAt: latest.createdAt.toISOString(),
          }
        : null,
      lesson: {
        id: thread.lesson.id,
        epNumber: thread.lesson.epNumber,
        title: thread.lesson.title,
      },
      course: {
        title: thread.lesson.course.title,
        coverImageUrl: thread.lesson.course.coverImageUrl,
      },
    };
  });

  return NextResponse.json({ inbox: items });
}
