import prisma from "@/lib/db";
export { formatCompactDuration, formatPrice } from "@/lib/formatters";

const PUBLISHED = true;

export type StorefrontCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  subjectCategory: string;
  level: string;
  gradeLevel: string;
  subject: string;
  coverImageUrl: string | null;
  courseCode: string;
  lessonCount: number;
  chapterCount: number;
  durationSeconds: number;
};

export type StorefrontPackage = {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  coverImageUrl: string | null;
  courses: StorefrontCourse[];
  courseCount: number;
  lessonCount: number;
  durationSeconds: number;
};

type CourseWithContent = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  subjectCategory: string;
  level: string;
  gradeLevel: string;
  subject: string;
  coverImageUrl: string | null;
  courseCode: string;
  chapters: Array<{
    lessons: Array<{
      durationSeconds: number | null;
    }>;
  }>;
};

function mapCourse(course: CourseWithContent): StorefrontCourse {
  const lessons = course.chapters.flatMap((chapter) => chapter.lessons);

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    category: course.category || course.subjectCategory || course.subject || "คอร์สออนไลน์",
    subjectCategory: course.subjectCategory || course.category || course.subject,
    level: course.level || course.gradeLevel || "ออนไลน์",
    gradeLevel: course.gradeLevel || course.level,
    subject: course.subject || course.subjectCategory || course.category,
    coverImageUrl: course.coverImageUrl,
    courseCode: course.courseCode,
    chapterCount: course.chapters.length,
    lessonCount: lessons.length,
    durationSeconds: lessons.reduce(
      (sum, lesson) => sum + (lesson.durationSeconds ?? 0),
      0,
    ),
  };
}

function mapPackage(coursePackage: {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  coverImageUrl: string | null;
  items: Array<{ course: CourseWithContent }>;
}): StorefrontPackage {
  const courses = coursePackage.items.map((item) => mapCourse(item.course));

  return {
    id: coursePackage.id,
    slug: coursePackage.slug,
    title: coursePackage.title,
    description: coursePackage.description,
    priceCents: coursePackage.priceCents,
    currency: coursePackage.currency,
    coverImageUrl: coursePackage.coverImageUrl,
    courses,
    courseCount: courses.length,
    lessonCount: courses.reduce((sum, course) => sum + course.lessonCount, 0),
    durationSeconds: courses.reduce(
      (sum, course) => sum + course.durationSeconds,
      0,
    ),
  };
}

const courseSelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  description: true,
  category: true,
  subjectCategory: true,
  level: true,
  gradeLevel: true,
  subject: true,
  coverImageUrl: true,
  courseCode: true,
  chapters: {
    where: { isPublished: PUBLISHED },
    orderBy: { sortOrder: "asc" as const },
    select: {
      lessons: {
        where: { isPublished: PUBLISHED },
        orderBy: { sortOrder: "asc" as const },
        select: { durationSeconds: true },
      },
    },
  },
};

const packageInclude = {
  items: {
    where: { course: { isPublished: PUBLISHED } },
    orderBy: { sortOrder: "asc" as const },
    include: {
      course: {
        select: courseSelect,
      },
    },
  },
};

export async function getPublishedCourses(): Promise<StorefrontCourse[]> {
  const courses = await prisma.course.findMany({
    where: { isPublished: PUBLISHED },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    select: courseSelect,
  });

  return courses.map(mapCourse);
}

export async function getPublishedPackages(): Promise<StorefrontPackage[]> {
  const packages = await prisma.coursePackage.findMany({
    where: { isPublished: PUBLISHED },
    orderBy: { createdAt: "asc" },
    include: packageInclude,
  });

  return packages.map(mapPackage);
}

export async function getStorefrontCatalog() {
  const [packages, courses] = await Promise.all([
    getPublishedPackages(),
    getPublishedCourses(),
  ]);

  const categories = Array.from(
    new Set(courses.map((course) => course.category).filter(Boolean)),
  );

  return { packages, courses, categories };
}

export async function getPackageBySlug(slug: string) {
  const coursePackage = await prisma.coursePackage.findFirst({
    where: { slug, isPublished: PUBLISHED },
    include: packageInclude,
  });

  return coursePackage ? mapPackage(coursePackage) : null;
}
