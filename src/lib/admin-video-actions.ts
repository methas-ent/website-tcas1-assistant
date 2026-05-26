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
    !courseId ||
    !isSubjectCategory(subjectCategory) ||
    (gradeLevel && !isGradeLevel(gradeLevel)) ||
    !(file instanceof File)
  ) {
    redirect(`${uploadPath}?error=invalid`);
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      subjectCategory: true,
      gradeLevel: true,
      category: true,
      subject: true,
      level: true,
    },
  });

  const courseSubjectCategory = course
    ? normalizeSubjectCategory(course.subjectCategory, course.category || course.subject)
    : null;
  const courseGradeLevel = course
    ? normalizeGradeLevel(course.gradeLevel, course.level)
    : null;

  if (
    !course ||
    courseSubjectCategory !== subjectCategory ||
    (gradeLevel && courseGradeLevel !== gradeLevel)
  ) {
    redirect(`${uploadPath}?error=invalid-selection`);
  }

  if (lessonId && !chapterId) {
    redirect(`${uploadPath}?error=invalid-selection`);
  }

  const selectedChapter = chapterId
    ? await prisma.chapter.findFirst({
        where: {
          id: chapterId,
          courseId,
        },
        select: {
          id: true,
          title: true,
        },
      })
    : null;

  if (chapterId && !selectedChapter) {
    redirect(`${uploadPath}?error=invalid-selection`);
  }

  const lesson = lessonId
    ? await prisma.lesson.findFirst({
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
        },
      })
    : null;

  if (lessonId && !lesson) {
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
            attachedLessonId: lesson?.id ?? null,
            attachedLessonTitle: lesson?.title ?? null,
            attachedChapterId: lesson?.chapterId ?? null,
            attachedChapterTitle: lesson?.chapter.title ?? null,
            attachedCourseId: course.id,
            attachedCourseTitle: course.title,
            selectedCourseId: course.id,
            selectedCourseTitle: course.title,
            selectedChapterId: selectedChapter?.id ?? null,
            selectedChapterTitle: selectedChapter?.title ?? null,
            subjectCategory,
            gradeLevel: gradeLevel || courseGradeLevel,
          }),
        },
        select: { id: true },
      });

      if (lesson) {
        await tx.lesson.update({
          where: { id: lesson.id },
          data: { videoAssetId: created.id },
        });
      }

      return created;
    });

    videoAssetId = videoAsset.id;
    console.info("[admin-video-upload]", {
      videoAssetId,
      lessonId: lesson?.id ?? null,
      courseId: course.id,
      chapterId: selectedChapter?.id ?? null,
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
  revalidatePath(`/admin/courses/${course.id}/edit`);
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
  const confirmation = text(formData, "confirmDelete");

  if (!videoId) {
    redirect("/admin/videos?error=invalid");
  }

  if (confirmation !== "DELETE_VIDEO") {
    redirect("/admin/videos?error=confirm-required");
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
