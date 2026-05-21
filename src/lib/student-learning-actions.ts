"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudent, canStudentAccessLesson } from "@/lib/student-learning";
import prisma from "@/lib/db";

function toProgressSeconds(value: FormDataEntryValue | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed);
}

export async function markLessonCompleteAction(formData: FormData) {
  const lessonId = String(formData.get("lessonId") ?? "");
  const user = await requireStudent(
    lessonId ? `/student/lessons/${lessonId}` : "/student/my-courses",
  );

  if (!lessonId) {
    redirect("/student/my-courses");
  }

  const lesson = await canStudentAccessLesson(user.id, lessonId);

  if (!lesson) {
    redirect("/student/my-courses");
  }

  const progressSeconds = toProgressSeconds(formData.get("progressSeconds"));
  const completedAt = new Date();

  await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: user.id,
        lessonId,
      },
    },
    create: {
      userId: user.id,
      userKey: `student:${user.id}`,
      lessonId,
      progressSeconds,
      completedAt,
    },
    update: {
      progressSeconds,
      completedAt,
    },
  });

  revalidatePath("/student/my-courses");
  revalidatePath(`/student/courses/${lesson.courseId}`);
  revalidatePath(`/student/lessons/${lesson.id}`);
}
