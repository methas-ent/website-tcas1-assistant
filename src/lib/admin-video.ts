import prisma from "@/lib/db";
import {
  normalizeGradeLevel,
  normalizeSubjectCategory,
} from "@/lib/course-taxonomy";

export async function getAdminVideos() {
  return prisma.videoAsset.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          sortOrder: true,
          chapter: {
            select: {
              id: true,
              title: true,
              sortOrder: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              subjectCategory: true,
              gradeLevel: true,
              category: true,
              level: true,
            },
          },
        },
      },
      _count: {
        select: {
          lessons: true,
        },
      },
    },
  });
}

export type AdminVideoUploadCourse = Awaited<
  ReturnType<typeof getAdminVideoUploadCatalog>
>[number];

export async function getAdminVideoUploadCatalog() {
  const courses = await prisma.course.findMany({
    orderBy: [{ subjectCategory: "asc" }, { gradeLevel: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      subjectCategory: true,
      gradeLevel: true,
      category: true,
      subject: true,
      level: true,
      chapters: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          sortOrder: true,
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              sortOrder: true,
              epNumber: true,
              videoAssetId: true,
            },
          },
        },
      },
    },
  });

  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    subjectCategory: normalizeSubjectCategory(
      course.subjectCategory,
      course.category || course.subject,
    ),
    gradeLevel: normalizeGradeLevel(course.gradeLevel, course.level),
    level: course.level,
    chapters: course.chapters,
  }));
}

export const getVideoUploadCourseOptions = getAdminVideoUploadCatalog;

export function formatBytes(value: bigint | number) {
  const bytes = typeof value === "bigint" ? Number(value) : value;

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const amount = bytes / 1024 ** exponent;

  return `${amount.toFixed(amount >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatVideoDate(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
