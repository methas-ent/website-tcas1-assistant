import prisma from "@/lib/db";

export function getAdminCatalogErrorMessage(error?: string) {
  const messages: Record<string, string> = {
    "duplicate-course-slug": "Slug คอร์สนี้ถูกใช้แล้ว",
    "duplicate-package-slug": "Slug แพ็กเกจนี้ถูกใช้แล้ว",
    "invalid-course": "กรุณากรอกชื่อ slug หมวดวิชา และระดับชั้นของคอร์สให้ถูกต้อง",
    "invalid-package": "กรุณากรอกชื่อ slug และราคาแพ็กเกจให้ถูกต้อง",
    "invalid-chapter": "กรุณากรอกชื่อ chapter และ sort order ให้ถูกต้อง",
    "invalid-lesson": "กรุณากรอกชื่อ lesson และ sort order ให้ถูกต้อง",
    "not-found": "ไม่พบข้อมูลที่ต้องการแก้ไข",
  };

  return error ? messages[error] ?? "บันทึกข้อมูลไม่สำเร็จ" : null;
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function formatThaiBahtFromCents(cents: number) {
  return (cents / 100).toFixed(0);
}

export async function getAdminCourseList(query?: string) {
  const search = query?.trim();

  return prisma.course.findMany({
    where: search
      ? {
          OR: [
            { title: { contains: search } },
            { slug: { contains: search } },
            { category: { contains: search } },
            { subjectCategory: { contains: search } },
            { gradeLevel: { contains: search } },
            { level: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          chapters: true,
          lessons: true,
          packageItems: true,
        },
      },
    },
  });
}

export async function getAdminCourseEdit(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      chapters: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            include: {
              videoAsset: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
      },
      packageItems: {
        include: {
          coursePackage: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });
}

export async function getAdminVideoAssets() {
  return prisma.videoAsset.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      originalFileName: true,
    },
  });
}

export async function getAdminPackageList(query?: string) {
  const search = query?.trim();

  return prisma.coursePackage.findMany({
    where: search
      ? {
          OR: [
            { title: { contains: search } },
            { slug: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          items: true,
          orderItems: true,
        },
      },
    },
  });
}

export async function getAdminPackageEdit(packageId: string) {
  return prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              category: true,
              subjectCategory: true,
              gradeLevel: true,
              level: true,
              isPublished: true,
            },
          },
        },
      },
    },
  });
}

export async function getAdminCourseOptions() {
  return prisma.course.findMany({
    orderBy: [{ title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      subjectCategory: true,
      gradeLevel: true,
      level: true,
      isPublished: true,
    },
  });
}
