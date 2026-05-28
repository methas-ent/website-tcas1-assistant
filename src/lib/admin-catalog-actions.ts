"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { isValidSlug, slugify } from "@/lib/admin-catalog";
import { requireAdmin } from "@/lib/admin";
import { saveCoverImage } from "@/lib/cover-image-storage";
import {
  isGradeLevel,
  isSubjectCategory,
  normalizeGradeLevel,
  normalizeSubjectCategory,
  normalizeTeacherName,
} from "@/lib/course-taxonomy";
import prisma from "@/lib/db";
import { getVideoStorageProvider } from "@/lib/video-storage";
import type { StoredVideoObject } from "@/lib/video-storage";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function intValue(formData: FormData, key: string, fallback = 0) {
  const parsed = Number.parseInt(text(formData, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function priceCents(formData: FormData, key: string) {
  const raw = text(formData, key).replace(/,/g, "");
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : -1;
}

function validationRedirect(path: string, error: string): never {
  redirect(`${path}?error=${error}`);
}

function formFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    typeof value.size === "number"
  ) {
    return value as File;
  }

  return null;
}

async function coverImageUrlFromUpload(
  formData: FormData,
  redirectPath: string,
  currentUrl: string | null = null,
) {
  const file = formFile(formData, "coverImageFile");

  if (!file || file.size <= 0) {
    return currentUrl;
  }

  try {
    const saved = await saveCoverImage(file);
    return saved.publicUrl;
  } catch {
    validationRedirect(redirectPath, "invalid-cover-image");
  }
}

function videoFileFromUpload(formData: FormData) {
  return formFile(formData, "videoFile") ?? formFile(formData, "file");
}

function videoUploadErrorCode(error: unknown) {
  const code = error instanceof Error ? error.message : "storage";

  if (code === "invalid") {
    return "invalid-course-video";
  }

  if (code === "type") {
    return "invalid-course-video-type";
  }

  if (code === "size") {
    return "invalid-course-video-size";
  }

  return "storage";
}

async function videoFromUpload(
  formData: FormData,
  redirectPath: string,
  required: boolean,
) {
  const file = videoFileFromUpload(formData);

  if (!file || file.size <= 0) {
    if (required) {
      validationRedirect(redirectPath, "invalid-course-video");
    }

    return null;
  }

  try {
    return await getVideoStorageProvider().saveVideo(file);
  } catch (error) {
    validationRedirect(redirectPath, videoUploadErrorCode(error));
  }
}

function uniqueChapterDrafts(
  chapters: Array<{ title: string; description: string | null; sortOrder: number }>,
) {
  const usedSlugs = new Set<string>();

  return chapters.map((chapter) => {
    const base = slugify(chapter.title) || `chapter-${chapter.sortOrder}`;
    let slug = base;
    let suffix = 2;

    while (usedSlugs.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(slug);
    return { ...chapter, slug };
  });
}

async function courseCreateSlug(
  formData: FormData,
  title: string,
  redirectPath: string,
) {
  const explicitSlug = slugify(text(formData, "slug"));

  if (!explicitSlug) {
    return uniqueCourseSlugFromTitle(title);
  }

  if (!isValidSlug(explicitSlug)) {
    validationRedirect(redirectPath, "invalid-course");
  }

  if (!(await ensureUniqueCourseSlug(explicitSlug))) {
    validationRedirect(redirectPath, "duplicate-course-slug");
  }

  return explicitSlug;
}

async function createCourseWithVideo(
  formData: FormData,
  redirectPath: string,
) {
  const title = text(formData, "title") || text(formData, "videoTitle");
  const description = text(formData, "description");
  const rawSubjectCategory = text(formData, "subjectCategory");
  const rawGradeLevel = text(formData, "gradeLevel");
  const subjectCategory = normalizeSubjectCategory(rawSubjectCategory);
  const gradeLevel = normalizeGradeLevel(rawGradeLevel);
  const teacherName = normalizeTeacherName(text(formData, "teacherName"));
  const cents = priceCents(formData, "priceThb");
  const currency = packageCurrency(formData);

  if (
    !title ||
    !isSubjectCategory(rawSubjectCategory) ||
    !isGradeLevel(rawGradeLevel) ||
    cents < 0 ||
    !currency
  ) {
    validationRedirect(redirectPath, "invalid-course");
  }

  const storedVideo = await videoFromUpload(formData, redirectPath, true);
  const slug = await courseCreateSlug(formData, title, redirectPath);
  const shouldPublish = readyStatus(formData);

  const created = await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        title,
        slug,
        subtitle: "",
        description,
        category: subjectCategory,
        subjectCategory,
        gradeLevel,
        teacherName,
        level: gradeLevel,
        priceCents: cents,
        currency,
        isPublished: shouldPublish,
        courseCode: slug.toUpperCase(),
        subject: subjectCategory || "คอร์สออนไลน์",
      },
      select: { id: true, title: true },
    });

    const chapter = await tx.chapter.create({
      data: {
        courseId: course.id,
        title: "Chapter 1",
        slug: "chapter-1",
        description: null,
        sortOrder: 1,
        isPublished: shouldPublish,
      },
      select: { id: true, title: true },
    });

    const videoAsset = await tx.videoAsset.create({
      data: videoAssetCreateData({
        storedVideo: storedVideo!,
        title,
        description,
        courseId: course.id,
        courseTitle: course.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        subjectCategory,
        gradeLevel,
      }),
      select: { id: true },
    });

    await tx.lesson.create({
      data: {
        courseId: course.id,
        chapterId: chapter.id,
        title,
        description,
        sortOrder: 1,
        epNumber: 1,
        videoAssetId: videoAsset.id,
        isPreview: false,
        isPublished: shouldPublish,
      },
    });

    return course;
  });

  return created;
}

function videoAssetCreateData({
  storedVideo,
  title,
  description,
  courseId,
  courseTitle,
  chapterId,
  chapterTitle,
  subjectCategory,
  gradeLevel,
}: {
  storedVideo: StoredVideoObject;
  title: string;
  description: string;
  courseId: string;
  courseTitle: string;
  chapterId: string | null;
  chapterTitle: string | null;
  subjectCategory: string;
  gradeLevel: string;
}) {
  return {
    title,
    storageProvider: storedVideo.storageProvider,
    storageKey: storedVideo.storageKey,
    originalFileName: storedVideo.originalFileName,
    mimeType: storedVideo.mimeType,
    sizeBytes: storedVideo.sizeBytes,
    status: "READY",
    metadataJson: JSON.stringify({
      description,
      attachedCourseId: courseId,
      attachedCourseTitle: courseTitle,
      attachedChapterId: chapterId,
      attachedChapterTitle: chapterTitle,
      selectedCourseId: courseId,
      selectedCourseTitle: courseTitle,
      selectedChapterId: chapterId,
      selectedChapterTitle: chapterTitle,
      subjectCategory,
      gradeLevel,
    }),
  };
}

async function ensureCourseExists(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  return Boolean(course);
}

async function ensureUniqueCourseSlug(slug: string, courseId?: string) {
  const existing = await prisma.course.findUnique({ where: { slug } });
  return !existing || existing.id === courseId;
}

async function ensureUniquePackageSlug(slug: string, packageId?: string) {
  const existing = await prisma.coursePackage.findUnique({ where: { slug } });
  return !existing || existing.id === packageId;
}

async function uniqueCourseSlugFromTitle(title: string) {
  const base = slugify(title) || "course";
  let candidate = base;
  let suffix = 2;

  while (await prisma.course.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function uniquePackageSlugFromTitle(title: string) {
  const base = slugify(title) || "package";
  let candidate = base;
  let suffix = 2;

  while (await prisma.coursePackage.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function readyStatus(formData: FormData) {
  const status = (
    text(formData, "submitStatus") ||
    text(formData, "status")
  ).toUpperCase();

  if (!status) {
    return bool(formData, "isPublished");
  }

  return ["READY", "PUBLISHED", "PUBLISH", "TRUE", "ON"].includes(status);
}

function publishStatus(formData: FormData) {
  const status = (
    text(formData, "submitStatus") ||
    text(formData, "status")
  ).toUpperCase();

  return ["DRAFT", "PRIVATE", "PUBLISHED"].includes(status)
    ? status
    : "DRAFT";
}

async function requiredCoverImageUrlFromUpload(
  formData: FormData,
  redirectPath: string,
) {
  const file = formFile(formData, "coverImageFile");

  if (!file || file.size <= 0) {
    validationRedirect(redirectPath, "invalid-cover-image");
  }

  try {
    const saved = await saveCoverImage(file);
    return saved.publicUrl;
  } catch {
    validationRedirect(redirectPath, "invalid-cover-image");
  }
}

function packageCurrency(formData: FormData) {
  const currency = text(formData, "currency").toUpperCase() || "THB";
  return currency === "THB" ? currency : "";
}

async function buildChapterSlug(courseId: string, title: string, sortOrder: number) {
  const base = slugify(title) || `chapter-${sortOrder || 1}`;
  let candidate = base;
  let suffix = 2;

  while (
    await prisma.chapter.findUnique({
      where: {
        courseId_slug: {
          courseId,
          slug: candidate,
        },
      },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function ensureChapterBelongsToCourse(chapterId: string, courseId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, courseId },
    select: { id: true },
  });

  return Boolean(chapter);
}

async function ensureUniqueLessonEpNumber(
  chapterId: string,
  epNumber: number,
  lessonId?: string,
) {
  const existing = await prisma.lesson.findUnique({
    where: {
      chapterId_epNumber: {
        chapterId,
        epNumber,
      },
    },
    select: { id: true },
  });

  return !existing || existing.id === lessonId;
}

async function ensureValidLessonVideo(
  videoAssetId: string | null,
  isPublished: boolean,
) {
  if (!videoAssetId) {
    return !isPublished;
  }

  const videoAsset = await prisma.videoAsset.findUnique({
    where: { id: videoAssetId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!videoAsset) {
    return false;
  }

  return !isPublished || videoAsset.status === "READY";
}

export async function quickCreateCourseAction(formData: FormData) {
  await requireAdmin("/admin/courses");

  const course = await createCourseWithVideo(formData, "/admin/courses");

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect(`/admin/courses/${course.id}/edit?saved=course`);
}

export async function createStudioContentAction(formData: FormData) {
  await requireAdmin("/admin/videos");

  const redirectPath = "/admin/videos";
  const itemType = text(formData, "itemType").toUpperCase();
  const title = text(formData, "title");
  const lessonTitle = text(formData, "lessonTitle");
  const videoTitle = lessonTitle || text(formData, "videoTitle") || title;
  const description = text(formData, "description");
  const rawSubjectCategory = text(formData, "subjectCategory");
  const rawGradeLevel = text(formData, "gradeLevel");
  const subjectCategory = normalizeSubjectCategory(rawSubjectCategory);
  const gradeLevel = normalizeGradeLevel(rawGradeLevel);
  const teacherName = normalizeTeacherName(text(formData, "teacherName"));
  const cents = priceCents(formData, "priceThb");
  const currency = packageCurrency(formData);
  const chapterNumber = intValue(formData, "chapterNumber", 0);
  const shouldPublish = readyStatus(formData);
  const studioStatus = publishStatus(formData);

  if (
    !["COURSE", "PACKAGE"].includes(itemType) ||
    !title ||
    !videoTitle ||
    !description ||
    !isSubjectCategory(rawSubjectCategory) ||
    !isGradeLevel(rawGradeLevel) ||
    cents < 0 ||
    !currency
  ) {
    validationRedirect(
      redirectPath,
      itemType === "PACKAGE" ? "invalid-package" : "invalid-course",
    );
  }

  if (itemType === "PACKAGE" && chapterNumber < 1) {
    validationRedirect(redirectPath, "invalid-chapter");
  }

  const [coverImageUrl, storedVideo] = await Promise.all([
    requiredCoverImageUrlFromUpload(formData, redirectPath),
    videoFromUpload(formData, redirectPath, true),
  ]);

  const courseSlug = await uniqueCourseSlugFromTitle(title);

  if (itemType === "COURSE") {
    const course = await prisma.$transaction(async (tx) => {
      const createdCourse = await tx.course.create({
        data: {
          title,
          slug: courseSlug,
          subtitle: gradeLevel,
          description,
          category: subjectCategory,
          subjectCategory,
          gradeLevel,
          teacherName,
          level: gradeLevel,
          priceCents: cents,
          currency,
          coverImageUrl,
          isPublished: shouldPublish,
          courseCode: courseSlug.toUpperCase(),
          subject: subjectCategory || "คอร์สออนไลน์",
        },
        select: { id: true, title: true },
      });

      const chapter = await tx.chapter.create({
        data: {
          courseId: createdCourse.id,
          title: "Chapter 1",
          slug: "chapter-1",
          description: null,
          sortOrder: 1,
          isPublished: shouldPublish,
        },
        select: { id: true, title: true },
      });

      const videoAsset = await tx.videoAsset.create({
        data: videoAssetCreateData({
          storedVideo: storedVideo!,
          title: videoTitle,
          description,
          courseId: createdCourse.id,
          courseTitle: createdCourse.title,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          subjectCategory,
          gradeLevel,
        }),
        select: { id: true },
      });

      await tx.lesson.create({
        data: {
          courseId: createdCourse.id,
          chapterId: chapter.id,
          title: videoTitle,
          description,
          sortOrder: 1,
          epNumber: 1,
          videoAssetId: videoAsset.id,
          isPreview: false,
          isPublished: shouldPublish,
        },
      });

      return createdCourse;
    });

    revalidatePath("/admin/courses");
    revalidatePath("/admin/videos");
    revalidatePath("/courses");
    redirect(
      `/admin/courses/${course.id}/edit?saved=${studioStatus.toLowerCase()}`,
    );
  }

  const [packageSlug, packageCourseSlug] = await Promise.all([
    uniquePackageSlugFromTitle(title),
    uniqueCourseSlugFromTitle(`${title} course`),
  ]);

  const created = await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        title,
        slug: packageCourseSlug,
        subtitle: gradeLevel,
        description,
        category: subjectCategory,
        subjectCategory,
        gradeLevel,
        teacherName,
        level: gradeLevel,
        priceCents: cents,
        currency,
        coverImageUrl,
        isPublished: shouldPublish,
        courseCode: packageCourseSlug.toUpperCase(),
        subject: subjectCategory || "คอร์สออนไลน์",
      },
      select: { id: true, title: true },
    });

    const coursePackage = await tx.coursePackage.create({
      data: {
        title,
        slug: packageSlug,
        description,
        priceCents: cents,
        currency,
        coverImageUrl,
        isPublished: shouldPublish,
        items: {
          create: {
            courseId: course.id,
            sortOrder: 1,
          },
        },
      },
      select: { id: true },
    });

    const chapter = await tx.chapter.create({
      data: {
        courseId: course.id,
        title: `Chapter ${chapterNumber}`,
        slug: `chapter-${chapterNumber}`,
        description,
        sortOrder: chapterNumber,
        isPublished: shouldPublish,
      },
      select: { id: true, title: true },
    });

    const videoAsset = await tx.videoAsset.create({
      data: videoAssetCreateData({
        storedVideo: storedVideo!,
        title: videoTitle,
        description,
        courseId: course.id,
        courseTitle: course.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        subjectCategory,
        gradeLevel,
      }),
      select: { id: true },
    });

    await tx.lesson.create({
      data: {
        courseId: course.id,
        chapterId: chapter.id,
        title: videoTitle,
        description,
        sortOrder: chapterNumber,
        epNumber: chapterNumber,
        videoAssetId: videoAsset.id,
        isPreview: false,
        isPublished: shouldPublish,
      },
    });

    return { courseId: course.id, packageId: coursePackage.id };
  });

  revalidatePath("/admin/courses");
  revalidatePath("/admin/packages");
  revalidatePath("/admin/videos");
  revalidatePath("/courses");
  redirect(
    `/admin/packages/${created.packageId}/edit?saved=${studioStatus.toLowerCase()}`,
  );
}

export async function createCourseOrPackageAction(formData: FormData) {
  await requireAdmin("/admin/courses");

  const itemType = text(formData, "itemType").toUpperCase();
  const title = text(formData, "title");
  const rawGradeLevel = text(formData, "gradeLevel");
  const gradeLevel = normalizeGradeLevel(rawGradeLevel);
  const subjectCategory = normalizeSubjectCategory(title);
  const teacherName = normalizeTeacherName(text(formData, "teacherName"));
  const cents = priceCents(formData, "priceThb");
  const currency = packageCurrency(formData);
  const description = text(formData, "description");
  const shouldPublish = readyStatus(formData);

  if (
    !["COURSE", "PACKAGE"].includes(itemType) ||
    !title ||
    !isGradeLevel(rawGradeLevel) ||
    cents < 0 ||
    !currency
  ) {
    validationRedirect("/admin/courses", "invalid-course");
  }

  if (itemType === "COURSE") {
    const slug = await uniqueCourseSlugFromTitle(title);

    await prisma.course.create({
      data: {
        title,
        slug,
        subtitle: gradeLevel,
        description,
        category: subjectCategory,
        subjectCategory,
        gradeLevel,
        teacherName,
        level: gradeLevel,
        priceCents: cents,
        currency,
        isPublished: shouldPublish,
        courseCode: slug.toUpperCase(),
        subject: title,
      },
    });

    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    redirect("/admin/courses?saved=course");
  }

  const chapterCount = intValue(formData, "chapterCount", 0);

  if (chapterCount < 1 || chapterCount > 6) {
    validationRedirect("/admin/courses", "invalid-chapter");
  }

  const [packageSlug, courseSlug] = await Promise.all([
    uniquePackageSlugFromTitle(title),
    uniqueCourseSlugFromTitle(title),
  ]);

  await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        title,
        slug: courseSlug,
        subtitle: gradeLevel,
        description,
        category: subjectCategory,
        subjectCategory,
        gradeLevel,
        teacherName,
        level: gradeLevel,
        priceCents: cents,
        currency,
        isPublished: shouldPublish,
        courseCode: courseSlug.toUpperCase(),
        subject: title,
      },
      select: { id: true },
    });

    await tx.coursePackage.create({
      data: {
        title,
        slug: packageSlug,
        description,
        priceCents: cents,
        currency,
        isPublished: shouldPublish,
        items: {
          create: {
            courseId: course.id,
            sortOrder: 1,
          },
        },
      },
    });

    for (let sortOrder = 1; sortOrder <= chapterCount; sortOrder += 1) {
      await tx.chapter.create({
        data: {
          courseId: course.id,
          title: `Chapter ${sortOrder}`,
          slug: `chapter-${sortOrder}`,
          description: null,
          sortOrder,
          isPublished: shouldPublish,
        },
      });
    }
  });

  revalidatePath("/admin/courses");
  revalidatePath("/admin/packages");
  revalidatePath("/courses");
  redirect("/admin/courses?saved=package");
}

export async function createPackageCourseBundleAction(formData: FormData) {
  await requireAdmin("/admin/courses");

  const packageTitle = text(formData, "packageTitle");
  const courseTitle = text(formData, "courseTitle") || packageTitle;
  const packageDescription = optionalText(formData, "chapterDescription");
  const chapterDrafts = uniqueChapterDrafts(
    [1, 2, 3]
      .map((sortOrder) => {
        const title =
          text(formData, `chapterTitle${sortOrder}`) ||
          (sortOrder === 1 ? text(formData, "chapterTitle") : "");
        const description =
          optionalText(formData, `chapterDescription${sortOrder}`) ??
          (sortOrder === 1 ? packageDescription : null);

        return {
          title,
          description,
          sortOrder,
        };
      })
      .filter((chapter) => chapter.title),
  );
  const rawSubjectCategory = text(formData, "subjectCategory");
  const rawGradeLevel = text(formData, "gradeLevel");
  const subjectCategory = normalizeSubjectCategory(rawSubjectCategory);
  const gradeLevel = normalizeGradeLevel(rawGradeLevel);
  const cents = priceCents(formData, "priceThb");
  const currency = packageCurrency(formData);

  if (
    !packageTitle ||
    !courseTitle ||
    !isSubjectCategory(rawSubjectCategory) ||
    !isGradeLevel(rawGradeLevel) ||
    cents < 0 ||
    !currency
  ) {
    validationRedirect("/admin/courses", "invalid-package");
  }

  const [packageSlug, courseSlug] = await Promise.all([
    uniquePackageSlugFromTitle(packageTitle),
    uniqueCourseSlugFromTitle(courseTitle),
  ]);
  const shouldPublish = readyStatus(formData);

  const created = await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        title: courseTitle,
        slug: courseSlug,
        subtitle: gradeLevel,
        description: packageDescription ?? "",
        category: subjectCategory,
        subjectCategory,
        gradeLevel,
        teacherName: normalizeTeacherName(text(formData, "teacherName")),
        level: gradeLevel,
        isPublished: shouldPublish,
        courseCode: courseSlug.toUpperCase(),
        subject: subjectCategory || "คอร์สออนไลน์",
      },
    });

    const coursePackage = await tx.coursePackage.create({
      data: {
        title: packageTitle,
        slug: packageSlug,
        description:
          packageDescription ??
          `แพ็กเกจ ${packageTitle} สำหรับคอร์ส ${courseTitle}`,
        priceCents: cents,
        currency,
        isPublished: shouldPublish,
        items: {
          create: {
            courseId: course.id,
            sortOrder: 1,
          },
        },
      },
    });

    for (const chapter of chapterDrafts) {
      await tx.chapter.create({
        data: {
          courseId: course.id,
          title: chapter.title,
          slug: chapter.slug,
          description: chapter.description,
          sortOrder: chapter.sortOrder,
          isPublished: shouldPublish,
        },
      });
    }

    return { courseId: course.id, packageId: coursePackage.id };
  });

  revalidatePath("/admin/courses");
  revalidatePath("/admin/packages");
  revalidatePath(`/admin/packages/${created.packageId}/edit`);
  revalidatePath("/courses");
  redirect(`/admin/courses/${created.courseId}/edit?saved=bundle`);
}

export async function createCourseAction(formData: FormData) {
  await requireAdmin("/admin/courses/new");

  const course = await createCourseWithVideo(formData, "/admin/courses/new");

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect(`/admin/courses/${course.id}/edit?saved=course`);
}

export async function updateCourseAction(formData: FormData) {
  const courseId = text(formData, "courseId");
  const redirectPath = `/admin/courses/${courseId}/edit`;
  await requireAdmin(redirectPath);

  const title = text(formData, "title");
  const slug = slugify(text(formData, "slug"));
  const description = text(formData, "description");
  const rawSubjectCategory = text(formData, "subjectCategory");
  const rawGradeLevel = text(formData, "gradeLevel");
  const subjectCategory = normalizeSubjectCategory(rawSubjectCategory);
  const gradeLevel = normalizeGradeLevel(rawGradeLevel);
  const level = text(formData, "level") || gradeLevel;
  const teacherName = normalizeTeacherName(text(formData, "teacherName"));
  const cents = priceCents(formData, "priceThb");
  const currency = packageCurrency(formData);
  const shouldPublish = readyStatus(formData);

  if (
    !courseId ||
    !title ||
    !slug ||
    !isValidSlug(slug) ||
    !isSubjectCategory(rawSubjectCategory) ||
    !isGradeLevel(rawGradeLevel) ||
    cents < 0 ||
    !currency
  ) {
    validationRedirect(redirectPath, "invalid-course");
  }

  if (!(await ensureUniqueCourseSlug(slug, courseId))) {
    validationRedirect(redirectPath, "duplicate-course-slug");
  }

  const currentCourse = await prisma.course.findUnique({
    where: { id: courseId },
    select: { coverImageUrl: true },
  });

  if (!currentCourse) {
    validationRedirect(redirectPath, "not-found");
  }

  const [coverImageUrl, storedVideo] = await Promise.all([
    coverImageUrlFromUpload(formData, redirectPath, currentCourse.coverImageUrl),
    videoFromUpload(formData, redirectPath, false),
  ]);

  await prisma.$transaction(async (tx) => {
    const updatedCourse = await tx.course.update({
      where: { id: courseId },
      data: {
        title,
        slug,
        subtitle: text(formData, "subtitle"),
        description,
        category: subjectCategory,
        subjectCategory,
        gradeLevel,
        teacherName,
        level,
        priceCents: cents,
        currency,
        coverImageUrl,
        isPublished: shouldPublish,
        subject: subjectCategory || "คอร์สออนไลน์",
      },
      select: { id: true, title: true },
    });

    if (!storedVideo) {
      return;
    }

    let chapter = await tx.chapter.findFirst({
      where: { courseId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true },
    });

    if (!chapter) {
      chapter = await tx.chapter.create({
        data: {
          courseId,
          title: "Chapter 1",
          slug: "chapter-1",
          description: null,
          sortOrder: 1,
          isPublished: shouldPublish,
        },
        select: { id: true, title: true },
      });
    }

    const lesson = await tx.lesson.findFirst({
      where: { courseId, chapterId: chapter.id },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });

    const videoAsset = await tx.videoAsset.create({
      data: videoAssetCreateData({
        storedVideo,
        title,
        description,
        courseId,
        courseTitle: updatedCourse.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        subjectCategory,
        gradeLevel,
      }),
      select: { id: true },
    });

    if (lesson) {
      await tx.lesson.update({
        where: { id: lesson.id },
        data: {
          title,
          description,
          videoAssetId: videoAsset.id,
          isPublished: shouldPublish,
        },
      });
      return;
    }

    await tx.lesson.create({
      data: {
        courseId,
        chapterId: chapter.id,
        title,
        description,
        sortOrder: 1,
        epNumber: 1,
        videoAssetId: videoAsset.id,
        isPreview: false,
        isPublished: shouldPublish,
      },
    });
  });

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}/edit`);
  revalidatePath("/courses");
  redirect(`/admin/courses/${courseId}/edit?saved=course`);
}

export async function quickUpdateCourseAction(formData: FormData) {
  const courseId = text(formData, "courseId");
  await requireAdmin("/admin/videos");

  const title = text(formData, "title");
  const rawSubjectCategory = text(formData, "subjectCategory");
  const rawGradeLevel = text(formData, "gradeLevel");
  const subjectCategory = normalizeSubjectCategory(rawSubjectCategory);
  const gradeLevel = normalizeGradeLevel(rawGradeLevel);

  if (
    !courseId ||
    !title ||
    !isSubjectCategory(rawSubjectCategory) ||
    !isGradeLevel(rawGradeLevel)
  ) {
    validationRedirect("/admin/videos", "invalid-course");
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title,
      category: subjectCategory,
      subjectCategory,
      gradeLevel,
      level: gradeLevel,
      isPublished: readyStatus(formData),
      subject: subjectCategory || "คอร์สออนไลน์",
    },
  });

  revalidatePath("/admin/videos");
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect("/admin/videos?saved=course");
}

export async function deleteCourseAction(formData: FormData) {
  const courseId = text(formData, "courseId");
  await requireAdmin("/admin/videos");

  const course = courseId
    ? await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true,
          _count: {
            select: {
              enrollments: true,
              packageItems: true,
            },
          },
        },
      })
    : null;

  if (!course) {
    validationRedirect("/admin/videos", "not-found");
  }

  const courseToDelete = course!;

  if (
    courseToDelete._count.enrollments > 0 ||
    courseToDelete._count.packageItems > 0
  ) {
    validationRedirect("/admin/videos", "cannot-delete-course");
  }

  await prisma.course.delete({ where: { id: courseToDelete.id } });

  revalidatePath("/admin/videos");
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect("/admin/videos?saved=deleted");
}

export async function createChapterAction(formData: FormData) {
  const courseId = text(formData, "courseId");
  await requireAdmin(`/admin/courses/${courseId}/edit`);

  const title = text(formData, "title");
  const sortOrder = intValue(formData, "sortOrder", 1);

  if (!courseId || !title || sortOrder < 0 || !(await ensureCourseExists(courseId))) {
    validationRedirect(`/admin/courses/${courseId}/edit`, "invalid-chapter");
  }

  await prisma.chapter.create({
    data: {
      courseId,
      title,
      slug: await buildChapterSlug(courseId, title, sortOrder),
      description: optionalText(formData, "description"),
      sortOrder,
      isPublished: bool(formData, "isPublished"),
    },
  });

  revalidatePath(`/admin/courses/${courseId}/edit`);
  redirect(`/admin/courses/${courseId}/edit?saved=chapter`);
}

export async function updateChapterAction(formData: FormData) {
  const courseId = text(formData, "courseId");
  const chapterId = text(formData, "chapterId");
  await requireAdmin(`/admin/courses/${courseId}/edit`);

  const title = text(formData, "title");
  const sortOrder = intValue(formData, "sortOrder", 0);

  if (
    !courseId ||
    !chapterId ||
    !title ||
    sortOrder < 0 ||
    !(await ensureChapterBelongsToCourse(chapterId, courseId))
  ) {
    validationRedirect(`/admin/courses/${courseId}/edit`, "invalid-chapter");
  }

  await prisma.chapter.update({
    where: { id: chapterId, courseId },
    data: {
      title,
      description: optionalText(formData, "description"),
      sortOrder,
      isPublished: bool(formData, "isPublished"),
    },
  });

  revalidatePath(`/admin/courses/${courseId}/edit`);
  redirect(`/admin/courses/${courseId}/edit?saved=chapter`);
}

export async function createLessonAction(formData: FormData) {
  const courseId = text(formData, "courseId");
  const chapterId = text(formData, "chapterId");
  await requireAdmin(`/admin/courses/${courseId}/edit`);

  const title = text(formData, "title");
  const sortOrder = intValue(formData, "sortOrder", 1);
  const videoAssetId = optionalText(formData, "videoAssetId");
  const isPublished = bool(formData, "isPublished");

  if (
    !courseId ||
    !chapterId ||
    !title ||
    sortOrder < 0 ||
    !(await ensureChapterBelongsToCourse(chapterId, courseId)) ||
    !(await ensureUniqueLessonEpNumber(chapterId, sortOrder)) ||
    !(await ensureValidLessonVideo(videoAssetId, isPublished))
  ) {
    validationRedirect(`/admin/courses/${courseId}/edit`, "invalid-lesson");
  }

  await prisma.lesson.create({
    data: {
      courseId,
      chapterId,
      title,
      description: optionalText(formData, "description"),
      sortOrder,
      epNumber: sortOrder,
      durationSeconds: intValue(formData, "durationSeconds", 0) || null,
      videoAssetId,
      isPreview: bool(formData, "isPreview"),
      isPublished,
    },
  });

  revalidatePath(`/admin/courses/${courseId}/edit`);
  redirect(`/admin/courses/${courseId}/edit?saved=lesson`);
}

export async function updateLessonAction(formData: FormData) {
  const courseId = text(formData, "courseId");
  const lessonId = text(formData, "lessonId");
  await requireAdmin(`/admin/courses/${courseId}/edit`);

  const title = text(formData, "title");
  const sortOrder = intValue(formData, "sortOrder", 0);
  const videoAssetId = optionalText(formData, "videoAssetId");
  const isPublished = bool(formData, "isPublished");

  const lesson = lessonId
    ? await prisma.lesson.findFirst({
        where: { id: lessonId, courseId },
        select: { id: true, chapterId: true },
      })
    : null;

  if (
    !courseId ||
    !lessonId ||
    !lesson ||
    !title ||
    sortOrder < 0 ||
    !(await ensureUniqueLessonEpNumber(lesson.chapterId, sortOrder, lessonId)) ||
    !(await ensureValidLessonVideo(videoAssetId, isPublished))
  ) {
    validationRedirect(`/admin/courses/${courseId}/edit`, "invalid-lesson");
  }

  await prisma.lesson.update({
    where: { id: lessonId, courseId },
    data: {
      title,
      description: optionalText(formData, "description"),
      sortOrder,
      epNumber: sortOrder,
      durationSeconds: intValue(formData, "durationSeconds", 0) || null,
      videoAssetId,
      isPreview: bool(formData, "isPreview"),
      isPublished,
    },
  });

  revalidatePath(`/admin/courses/${courseId}/edit`);
  redirect(`/admin/courses/${courseId}/edit?saved=lesson`);
}

/**
 * Reorder lessons inside a chapter.
 *
 * FormData contract:
 *  - courseId: string
 *  - chapterId: string
 *  - orderedLessonIds: JSON-encoded string[]   (e.g. '["abc","def","ghi"]')
 *
 * The new sortOrder/epNumber for each lesson is derived from its position in
 * the array: index 0 -> sortOrder 0, epNumber 1, etc.
 *
 * Uses a two-pass transaction to dodge the @@unique([chapterId, epNumber])
 * constraint: first park every affected lesson at a temporary negative
 * epNumber, then set the final values.
 */
export async function reorderLessonsAction(formData: FormData) {
  const courseId = text(formData, "courseId");
  const chapterId = text(formData, "chapterId");
  await requireAdmin(`/admin/courses/${courseId}/edit`);

  const redirectPath = `/admin/courses/${courseId}/edit`;
  const rawIds = text(formData, "orderedLessonIds");

  let orderedIds: unknown;
  try {
    orderedIds = JSON.parse(rawIds);
  } catch {
    validationRedirect(redirectPath, "invalid-lesson");
  }

  if (
    !courseId ||
    !chapterId ||
    !Array.isArray(orderedIds) ||
    orderedIds.length === 0 ||
    !orderedIds.every((id) => typeof id === "string" && id.length > 0) ||
    !(await ensureChapterBelongsToCourse(chapterId, courseId))
  ) {
    validationRedirect(redirectPath, "invalid-lesson");
  }

  const lessonIds = orderedIds as string[];
  const uniqueIds = new Set(lessonIds);

  if (uniqueIds.size !== lessonIds.length) {
    validationRedirect(redirectPath, "invalid-lesson");
  }

  const existingLessons = await prisma.lesson.findMany({
    where: { chapterId, courseId, id: { in: lessonIds } },
    select: { id: true },
  });

  if (existingLessons.length !== lessonIds.length) {
    validationRedirect(redirectPath, "invalid-lesson");
  }

  await prisma.$transaction(async (tx) => {
    // Pass 1: temporarily move lessons to negative epNumber values so the
    // unique [chapterId, epNumber] constraint isn't violated during reorder.
    for (let i = 0; i < lessonIds.length; i += 1) {
      await tx.lesson.update({
        where: { id: lessonIds[i] },
        data: {
          sortOrder: -(i + 1),
          epNumber: -(i + 1),
        },
      });
    }

    // Pass 2: assign final ordering.
    for (let i = 0; i < lessonIds.length; i += 1) {
      await tx.lesson.update({
        where: { id: lessonIds[i] },
        data: {
          sortOrder: i,
          epNumber: i + 1,
        },
      });
    }
  });

  revalidatePath(redirectPath);
  redirect(`${redirectPath}?saved=lesson-order`);
}

export async function createPackageAction(formData: FormData) {
  await requireAdmin("/admin/packages/new");

  const title = text(formData, "title");
  const slug = slugify(text(formData, "slug"));
  const cents = priceCents(formData, "priceThb");
  const currency = packageCurrency(formData);

  if (!title || !slug || !isValidSlug(slug) || cents < 0 || !currency) {
    validationRedirect("/admin/packages/new", "invalid-package");
  }

  if (!(await ensureUniquePackageSlug(slug))) {
    validationRedirect("/admin/packages/new", "duplicate-package-slug");
  }

  const coursePackage = await prisma.$transaction(async (tx) => {
    const createdPackage = await tx.coursePackage.create({
      data: {
        title,
        slug,
        description: text(formData, "description"),
        priceCents: cents,
        currency,
        coverImageUrl: await coverImageUrlFromUpload(
          formData,
          "/admin/packages/new",
        ),
        isPublished: readyStatus(formData),
      },
    });

    await syncPackageCourses(tx, createdPackage.id, formData.getAll("courseIds"));

    return createdPackage;
  });

  revalidatePath("/admin/packages");
  revalidatePath("/courses");
  redirect(`/admin/packages/${coursePackage.id}/edit`);
}

export async function quickCreatePackageAction(formData: FormData) {
  await requireAdmin("/admin/videos");

  const title = text(formData, "title");
  const cents = priceCents(formData, "priceThb");
  const currency = packageCurrency(formData);

  if (!title || cents < 0 || !currency) {
    validationRedirect("/admin/videos", "invalid-package");
  }

  await prisma.coursePackage.create({
    data: {
      title,
      slug: await uniquePackageSlugFromTitle(title),
      description: "",
      priceCents: cents,
      currency,
      isPublished: readyStatus(formData),
    },
  });

  revalidatePath("/admin/videos");
  revalidatePath("/admin/packages");
  revalidatePath("/courses");
  redirect("/admin/videos?saved=package");
}

export async function updatePackageAction(formData: FormData) {
  const packageId = text(formData, "packageId");
  await requireAdmin(`/admin/packages/${packageId}/edit`);

  const title = text(formData, "title");
  const slug = slugify(text(formData, "slug"));
  const cents = priceCents(formData, "priceThb");
  const currency = packageCurrency(formData);

  if (!packageId || !title || !slug || !isValidSlug(slug) || cents < 0 || !currency) {
    validationRedirect(`/admin/packages/${packageId}/edit`, "invalid-package");
  }

  if (!(await ensureUniquePackageSlug(slug, packageId))) {
    validationRedirect(
      `/admin/packages/${packageId}/edit`,
      "duplicate-package-slug",
    );
  }

  const currentPackage = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    select: { coverImageUrl: true },
  });

  if (!currentPackage) {
    validationRedirect(`/admin/packages/${packageId}/edit`, "not-found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.coursePackage.update({
      where: { id: packageId },
      data: {
        title,
        slug,
        description: text(formData, "description"),
        priceCents: cents,
        currency,
        coverImageUrl: await coverImageUrlFromUpload(
          formData,
          `/admin/packages/${packageId}/edit`,
          currentPackage.coverImageUrl,
        ),
        isPublished: readyStatus(formData),
      },
    });

    await syncPackageCourses(tx, packageId, formData.getAll("courseIds"));
  });

  revalidatePath("/admin/packages");
  revalidatePath(`/admin/packages/${packageId}/edit`);
  revalidatePath("/courses");
  redirect(`/admin/packages/${packageId}/edit?saved=package`);
}

export async function quickUpdatePackageAction(formData: FormData) {
  const packageId = text(formData, "packageId");
  await requireAdmin("/admin/videos");

  const title = text(formData, "title");
  const cents = priceCents(formData, "priceThb");
  const currency = packageCurrency(formData);

  if (!packageId || !title || cents < 0 || !currency) {
    validationRedirect("/admin/videos", "invalid-package");
  }

  await prisma.coursePackage.update({
    where: { id: packageId },
    data: {
      title,
      priceCents: cents,
      currency,
      isPublished: readyStatus(formData),
    },
  });

  revalidatePath("/admin/videos");
  revalidatePath("/admin/packages");
  revalidatePath("/courses");
  redirect("/admin/videos?saved=package");
}

export async function deletePackageAction(formData: FormData) {
  const packageId = text(formData, "packageId");
  await requireAdmin("/admin/videos");

  const coursePackage = packageId
    ? await prisma.coursePackage.findUnique({
        where: { id: packageId },
        select: {
          id: true,
          _count: {
            select: {
              orderItems: true,
            },
          },
        },
      })
    : null;

  if (!coursePackage) {
    validationRedirect("/admin/videos", "not-found");
  }

  const packageToDelete = coursePackage!;

  if (packageToDelete._count.orderItems > 0) {
    validationRedirect("/admin/videos", "cannot-delete-package");
  }

  await prisma.coursePackage.delete({ where: { id: packageToDelete.id } });

  revalidatePath("/admin/videos");
  revalidatePath("/admin/packages");
  revalidatePath("/courses");
  redirect("/admin/videos?saved=deleted");
}

async function syncPackageCourses(
  tx: Prisma.TransactionClient,
  packageId: string,
  values: FormDataEntryValue[],
) {
  const courseIds = values
    .map((value) => String(value))
    .filter(Boolean);
  const uniqueCourseIds = Array.from(new Set(courseIds));

  await tx.coursePackageItem.deleteMany({
    where: {
      packageId,
      courseId: { notIn: uniqueCourseIds },
    },
  });

  for (const [index, courseId] of uniqueCourseIds.entries()) {
    await tx.coursePackageItem.upsert({
      where: {
        packageId_courseId: {
          packageId,
          courseId,
        },
      },
      create: {
        packageId,
        courseId,
        sortOrder: index + 1,
      },
      update: {
        sortOrder: index + 1,
      },
    });
  }
}
