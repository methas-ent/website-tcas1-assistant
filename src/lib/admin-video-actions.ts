"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isGradeLevel,
  isSubjectCategory,
  normalizeGradeLevel,
  normalizeSubjectCategory,
} from "@/lib/course-taxonomy";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/db";
import { getVideoStorageProvider } from "@/lib/video-storage";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function uploadVideoAction(formData: FormData) {
  await requireAdmin("/admin/videos/upload");

  const title = text(formData, "title");
  const description = text(formData, "description");
  const subjectCategory = text(formData, "subjectCategory");
  const gradeLevel = text(formData, "gradeLevel");
  const courseId = text(formData, "courseId");
  const chapterId = text(formData, "chapterId");
  const lessonId = text(formData, "lessonId");
  const file = formData.get("file");

  if (
    !title ||
    !subjectCategory ||
    !gradeLevel ||
    !courseId ||
    !chapterId ||
    !lessonId ||
    !isSubjectCategory(subjectCategory) ||
    !isGradeLevel(gradeLevel) ||
    !(file instanceof File)
  ) {
    redirect("/admin/videos/upload?error=invalid");
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      courseId,
      chapterId,
    },
    select: {
      id: true,
      title: true,
      courseId: true,
      chapterId: true,
      chapter: {
        select: {
          title: true,
        },
      },
      course: {
        select: {
          title: true,
          subjectCategory: true,
          gradeLevel: true,
          category: true,
          subject: true,
          level: true,
        },
      },
    },
  });

  const lessonSubjectCategory = lesson
    ? normalizeSubjectCategory(
        lesson.course.subjectCategory,
        lesson.course.category || lesson.course.subject,
      )
    : null;
  const lessonGradeLevel = lesson
    ? normalizeGradeLevel(lesson.course.gradeLevel, lesson.course.level)
    : null;

  if (
    !lesson ||
    lessonSubjectCategory !== subjectCategory ||
    lessonGradeLevel !== gradeLevel
  ) {
    redirect("/admin/videos/upload?error=invalid-selection");
  }

  let videoAssetId: string;

  try {
    const stored = await getVideoStorageProvider().saveVideo(file);

    const videoAsset = await prisma.$transaction(async (tx) => {
      const created = await tx.videoAsset.create({
        data: {
          title,
          storageProvider: stored.storageProvider,
          storageKey: stored.storageKey,
          originalFileName: stored.originalFileName,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          status: "READY",
          metadataJson: JSON.stringify({
            description,
            attachedLessonId: lesson.id,
            attachedLessonTitle: lesson.title,
            attachedChapterId: lesson.chapterId,
            attachedChapterTitle: lesson.chapter.title,
            attachedCourseId: lesson.courseId,
            attachedCourseTitle: lesson.course.title,
            subjectCategory,
            gradeLevel,
          }),
        },
        select: { id: true },
      });

      await tx.lesson.update({
        where: { id: lesson.id },
        data: { videoAssetId: created.id },
      });

      return created;
    });

    videoAssetId = videoAsset.id;
    console.info("[admin-video-upload]", {
      videoAssetId,
      lessonId: lesson.id,
      courseId: lesson.courseId,
      storageProvider: stored.storageProvider,
      sizeBytes: stored.sizeBytes.toString(),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "storage";

    if (["invalid", "type", "size"].includes(code)) {
      redirect(`/admin/videos/upload?error=${code}`);
    }

    redirect("/admin/videos/upload?error=storage");
  }

  revalidatePath("/admin/videos");
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}/edit`);
  redirect(`/admin/videos?uploaded=${videoAssetId}`);
}
