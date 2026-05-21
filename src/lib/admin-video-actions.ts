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

function videoStatus(formData: FormData) {
  const status = text(formData, "status");

  return ["UPLOADED", "PROCESSING", "READY", "FAILED"].includes(status)
    ? status
    : "UPLOADED";
}

async function getVideoUsage(videoId: string) {
  const video = await prisma.videoAsset.findUnique({
    where: { id: videoId },
    select: {
      _count: {
        select: {
          lessons: true,
        },
      },
      lessons: {
        where: {
          isPublished: true,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  return video
    ? {
        lessonCount: video._count.lessons,
        hasPublishedLesson: video.lessons.length > 0,
      }
    : null;
}

export async function uploadVideoAction(formData: FormData) {
  await requireAdmin("/admin/videos/upload");

  const returnTo = text(formData, "returnTo");
  const uploadPath = returnTo === "/admin/videos" ? returnTo : "/admin/videos/upload";
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
    redirect(`${uploadPath}?error=invalid`);
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
    redirect(`${uploadPath}?error=invalid-selection`);
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
      redirect(`${uploadPath}?error=${code}`);
    }

    redirect(`${uploadPath}?error=storage`);
  }

  revalidatePath("/admin/videos");
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}/edit`);
  redirect(`/admin/videos?uploaded=${videoAssetId}`);
}

export async function updateVideoAction(formData: FormData) {
  await requireAdmin("/admin/videos");

  const videoId = text(formData, "videoId");
  const title = text(formData, "title");
  const status = videoStatus(formData);

  if (!videoId || !title) {
    redirect("/admin/videos?error=invalid");
  }

  const usage = await getVideoUsage(videoId);

  if (!usage) {
    redirect("/admin/videos?error=invalid");
  }

  if (usage.hasPublishedLesson && status !== "READY") {
    redirect("/admin/videos?error=cannot-change-attached");
  }

  await prisma.videoAsset.update({
    where: { id: videoId },
    data: {
      title,
      status,
    },
  });

  revalidatePath("/admin/videos");
  revalidatePath("/admin/courses");
  redirect("/admin/videos?saved=video");
}

export async function deleteVideoAction(formData: FormData) {
  await requireAdmin("/admin/videos");

  const videoId = text(formData, "videoId");

  if (!videoId) {
    redirect("/admin/videos?error=invalid");
  }

  const usage = await getVideoUsage(videoId);

  if (!usage) {
    redirect("/admin/videos?error=invalid");
  }

  if (usage.hasPublishedLesson) {
    redirect("/admin/videos?error=cannot-delete-attached");
  }

  await prisma.videoAsset.delete({
    where: { id: videoId },
  });

  revalidatePath("/admin/videos");
  revalidatePath("/admin/courses");
  redirect("/admin/videos?saved=deleted");
}
