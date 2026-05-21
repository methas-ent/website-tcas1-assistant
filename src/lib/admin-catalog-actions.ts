"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { isValidSlug, slugify } from "@/lib/admin-catalog";
import { requireAdmin } from "@/lib/admin";
import {
  isGradeLevel,
  isSubjectCategory,
  normalizeGradeLevel,
  normalizeSubjectCategory,
} from "@/lib/course-taxonomy";
import prisma from "@/lib/db";

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

function validationRedirect(path: string, error: string) {
  redirect(`${path}?error=${error}`);
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

export async function createCourseAction(formData: FormData) {
  await requireAdmin("/admin/courses/new");

  const title = text(formData, "title");
  const slug = slugify(text(formData, "slug"));
  const rawSubjectCategory = text(formData, "subjectCategory");
  const rawGradeLevel = text(formData, "gradeLevel");
  const subjectCategory = normalizeSubjectCategory(rawSubjectCategory);
  const gradeLevel = normalizeGradeLevel(rawGradeLevel);
  const level = text(formData, "level") || gradeLevel;

  if (
    !title ||
    !slug ||
    !isValidSlug(slug) ||
    !isSubjectCategory(rawSubjectCategory) ||
    !isGradeLevel(rawGradeLevel)
  ) {
    validationRedirect("/admin/courses/new", "invalid-course");
  }

  if (!(await ensureUniqueCourseSlug(slug))) {
    validationRedirect("/admin/courses/new", "duplicate-course-slug");
  }

  const course = await prisma.course.create({
    data: {
      title,
      slug,
      subtitle: text(formData, "subtitle"),
      description: text(formData, "description"),
      category: subjectCategory,
      subjectCategory,
      gradeLevel,
      level,
      coverImageUrl: optionalText(formData, "coverImageUrl"),
      isPublished: bool(formData, "isPublished"),
      courseCode: slug.toUpperCase(),
      subject: subjectCategory || "คอร์สออนไลน์",
    },
  });

  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${course.id}/edit`);
}

export async function updateCourseAction(formData: FormData) {
  const courseId = text(formData, "courseId");
  await requireAdmin(`/admin/courses/${courseId}/edit`);

  const title = text(formData, "title");
  const slug = slugify(text(formData, "slug"));
  const rawSubjectCategory = text(formData, "subjectCategory");
  const rawGradeLevel = text(formData, "gradeLevel");
  const subjectCategory = normalizeSubjectCategory(rawSubjectCategory);
  const gradeLevel = normalizeGradeLevel(rawGradeLevel);
  const level = text(formData, "level") || gradeLevel;

  if (
    !courseId ||
    !title ||
    !slug ||
    !isValidSlug(slug) ||
    !isSubjectCategory(rawSubjectCategory) ||
    !isGradeLevel(rawGradeLevel)
  ) {
    validationRedirect(`/admin/courses/${courseId}/edit`, "invalid-course");
  }

  if (!(await ensureUniqueCourseSlug(slug, courseId))) {
    validationRedirect(`/admin/courses/${courseId}/edit`, "duplicate-course-slug");
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title,
      slug,
      subtitle: text(formData, "subtitle"),
      description: text(formData, "description"),
      category: subjectCategory,
      subjectCategory,
      gradeLevel,
      level,
      coverImageUrl: optionalText(formData, "coverImageUrl"),
      isPublished: bool(formData, "isPublished"),
      subject: subjectCategory || "คอร์สออนไลน์",
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}/edit`);
  revalidatePath("/courses");
  redirect(`/admin/courses/${courseId}/edit?saved=course`);
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

export async function createPackageAction(formData: FormData) {
  await requireAdmin("/admin/packages/new");

  const title = text(formData, "title");
  const slug = slugify(text(formData, "slug"));
  const cents = priceCents(formData, "priceThb");

  if (!title || !slug || !isValidSlug(slug) || cents < 0) {
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
        currency: text(formData, "currency") || "THB",
        coverImageUrl: optionalText(formData, "coverImageUrl"),
        isPublished: bool(formData, "isPublished"),
      },
    });

    await syncPackageCourses(tx, createdPackage.id, formData.getAll("courseIds"));

    return createdPackage;
  });

  revalidatePath("/admin/packages");
  revalidatePath("/courses");
  redirect(`/admin/packages/${coursePackage.id}/edit`);
}

export async function updatePackageAction(formData: FormData) {
  const packageId = text(formData, "packageId");
  await requireAdmin(`/admin/packages/${packageId}/edit`);

  const title = text(formData, "title");
  const slug = slugify(text(formData, "slug"));
  const cents = priceCents(formData, "priceThb");

  if (!packageId || !title || !slug || !isValidSlug(slug) || cents < 0) {
    validationRedirect(`/admin/packages/${packageId}/edit`, "invalid-package");
  }

  if (!(await ensureUniquePackageSlug(slug, packageId))) {
    validationRedirect(
      `/admin/packages/${packageId}/edit`,
      "duplicate-package-slug",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.coursePackage.update({
      where: { id: packageId },
      data: {
        title,
        slug,
        description: text(formData, "description"),
        priceCents: cents,
        currency: text(formData, "currency") || "THB",
        coverImageUrl: optionalText(formData, "coverImageUrl"),
        isPublished: bool(formData, "isPublished"),
      },
    });

    await syncPackageCourses(tx, packageId, formData.getAll("courseIds"));
  });

  revalidatePath("/admin/packages");
  revalidatePath(`/admin/packages/${packageId}/edit`);
  revalidatePath("/courses");
  redirect(`/admin/packages/${packageId}/edit?saved=package`);
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
