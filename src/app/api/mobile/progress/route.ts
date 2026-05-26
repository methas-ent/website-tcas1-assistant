import { NextResponse, type NextRequest } from "next/server";
import { canStudentAccessLesson } from "@/lib/student-learning";
import { requireMobileStudent } from "@/lib/mobile-api";
import prisma from "@/lib/db";

export const runtime = "nodejs";

type ProgressBody = {
  lessonId?: unknown;
  progressSeconds?: unknown;
  completed?: unknown;
};

function clampProgressSeconds(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : 0;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.min(Math.floor(parsed), 24 * 60 * 60);
}

async function updateCourseProgress(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      lessons: {
        where: { isPublished: true, chapter: { isPublished: true } },
        select: {
          id: true,
          progress: {
            where: { userId },
            select: { completedAt: true },
          },
        },
      },
    },
  });

  const lessons = course?.lessons ?? [];
  const completedCount = lessons.filter(
    (lesson) => lesson.progress[0]?.completedAt,
  ).length;
  const percentComplete = lessons.length
    ? Math.round((completedCount / lessons.length) * 100)
    : 0;

  await prisma.courseProgress.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    create: {
      userId,
      userKey: `student:${userId}`,
      courseId,
      percentComplete,
    },
    update: {
      percentComplete,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireMobileStudent(request);

  if (!auth.ok) {
    return auth.response;
  }

  let body: ProgressBody;

  try {
    body = (await request.json()) as ProgressBody;
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const lessonId =
    typeof body.lessonId === "string" ? body.lessonId.trim() : "";

  if (!lessonId) {
    return NextResponse.json({ error: "MISSING_LESSON_ID" }, { status: 400 });
  }

  const lesson = await canStudentAccessLesson(auth.user.id, lessonId);

  if (!lesson) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const progressSeconds = clampProgressSeconds(body.progressSeconds);
  const completed = body.completed === true;
  const currentProgress = await prisma.lessonProgress.findUnique({
    where: {
      userId_lessonId: {
        userId: auth.user.id,
        lessonId,
      },
    },
    select: {
      completedAt: true,
      progressSeconds: true,
    },
  });
  const completedAt =
    currentProgress?.completedAt ?? (completed ? new Date() : null);
  const nextProgressSeconds = Math.max(
    progressSeconds,
    currentProgress?.progressSeconds ?? 0,
  );

  const progress = await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: auth.user.id,
        lessonId,
      },
    },
    create: {
      userId: auth.user.id,
      userKey: `student:${auth.user.id}`,
      lessonId,
      progressSeconds: nextProgressSeconds,
      completedAt,
    },
    update: {
      progressSeconds: nextProgressSeconds,
      completedAt,
    },
    select: {
      lessonId: true,
      progressSeconds: true,
      completedAt: true,
    },
  });

  await updateCourseProgress(auth.user.id, lesson.courseId);

  return NextResponse.json({
    progress: {
      ...progress,
      completedAt: progress.completedAt?.toISOString() ?? null,
    },
  });
}
