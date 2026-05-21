import prisma from "@/lib/db";
import { USER_KEY } from "@/lib/user";

const PUBLISHED = true;

export type CourseSummary = {
  id: string;
  slug: string;
  courseCode: string;
  title: string;
  subject: string;
  level: string;
  description: string;
  coverImageUrl: string | null;
  progressPercent: number;
  moduleCount: number;
  lessonCount: number;
  totalDurationSeconds: number;
  firstLessonId: string | null;
};

export type CourseDetail = CourseSummary & {
  modules: Array<{
    id: string;
    slug: string;
    title: string;
    sortOrder: number;
    lessonCount: number;
    completedLessonCount: number;
    totalDurationSeconds: number;
  }>;
};

export type ModuleDetail = {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  course: {
    id: string;
    slug: string;
    title: string;
    courseCode: string;
    subject: string;
  };
  lessons: Array<LessonListItem>;
};

export type LessonListItem = {
  id: string;
  epNumber: number;
  title: string;
  description: string | null;
  durationSeconds: number | null;
  completed: boolean;
};

export type WatchLessonContext = {
  lesson: LessonListItem;
  course: {
    slug: string;
    title: string;
    courseCode: string;
  };
  module: {
    slug: string;
    title: string;
  };
  lessons: Array<LessonListItem>;
  previousLessonId: string | null;
  nextLessonId: string | null;
};

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) {
    return "ยังไม่ระบุเวลา";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds} วินาที`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} นาที`;
  }

  return `${minutes} นาที ${remainingSeconds} วินาที`;
}

export async function getCoursesForUser(
  userKey: string = USER_KEY,
): Promise<CourseSummary[]> {
  const courses = await prisma.course.findMany({
    where: { isPublished: PUBLISHED },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      courseCode: true,
      title: true,
      subject: true,
      level: true,
      description: true,
      coverImageUrl: true,
      progress: {
        where: { userKey },
        select: { percentComplete: true },
      },
      chapters: {
        where: { isPublished: PUBLISHED },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          lessons: {
            where: { isPublished: PUBLISHED },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              durationSeconds: true,
            },
          },
        },
      },
    },
  });

  return courses.map((course) => {
    const lessons = course.chapters.flatMap((courseModule) => courseModule.lessons);

    return {
      id: course.id,
      slug: course.slug,
      courseCode: course.courseCode,
      title: course.title,
      subject: course.subject ?? "ไม่ระบุวิชา",
      level: course.level ?? "คอร์สออนไลน์",
      description: course.description ?? "",
      coverImageUrl: course.coverImageUrl,
      progressPercent: course.progress[0]?.percentComplete ?? 0,
      moduleCount: course.chapters.length,
      lessonCount: lessons.length,
      totalDurationSeconds: lessons.reduce(
        (sum, lesson) => sum + (lesson.durationSeconds ?? 0),
        0,
      ),
      firstLessonId: lessons[0]?.id ?? null,
    };
  });
}

export async function getCourseBySlug(
  slug: string,
  userKey: string = USER_KEY,
): Promise<CourseDetail | null> {
  const course = await prisma.course.findFirst({
    where: { slug, isPublished: PUBLISHED },
    select: {
      id: true,
      slug: true,
      courseCode: true,
      title: true,
      subject: true,
      level: true,
      description: true,
      coverImageUrl: true,
      progress: {
        where: { userKey },
        select: { percentComplete: true },
      },
      chapters: {
        where: { isPublished: PUBLISHED },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          sortOrder: true,
          lessons: {
            where: { isPublished: PUBLISHED },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              durationSeconds: true,
              progress: {
                where: { userKey },
                select: { completedAt: true },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    return null;
  }

  const lessons = course.chapters.flatMap((courseModule) => courseModule.lessons);

  return {
    id: course.id,
    slug: course.slug,
    courseCode: course.courseCode,
    title: course.title,
    subject: course.subject ?? "ไม่ระบุวิชา",
    level: course.level ?? "คอร์สออนไลน์",
    description: course.description ?? "",
    coverImageUrl: course.coverImageUrl,
    progressPercent: course.progress[0]?.percentComplete ?? 0,
    moduleCount: course.chapters.length,
    lessonCount: lessons.length,
    totalDurationSeconds: lessons.reduce(
      (sum, lesson) => sum + (lesson.durationSeconds ?? 0),
      0,
    ),
    firstLessonId: lessons[0]?.id ?? null,
    modules: course.chapters.map((courseModule) => ({
      id: courseModule.id,
      slug: courseModule.slug,
      title: courseModule.title,
      sortOrder: courseModule.sortOrder,
      lessonCount: courseModule.lessons.length,
      completedLessonCount: courseModule.lessons.filter(
        (lesson) => lesson.progress[0]?.completedAt,
      ).length,
      totalDurationSeconds: courseModule.lessons.reduce(
        (sum, lesson) => sum + (lesson.durationSeconds ?? 0),
        0,
      ),
    })),
  };
}

export async function getModuleBySlug(
  courseSlug: string,
  moduleSlug: string,
  userKey: string = USER_KEY,
): Promise<ModuleDetail | null> {
  const courseModule = await prisma.chapter.findFirst({
    where: {
      slug: moduleSlug,
      isPublished: PUBLISHED,
      course: {
        slug: courseSlug,
        isPublished: PUBLISHED,
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      sortOrder: true,
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          courseCode: true,
          subject: true,
        },
      },
      lessons: {
        where: { isPublished: PUBLISHED },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          epNumber: true,
          title: true,
          description: true,
          durationSeconds: true,
          progress: {
            where: { userKey },
            select: { completedAt: true },
          },
        },
      },
    },
  });

  if (!courseModule) {
    return null;
  }

  return {
    id: courseModule.id,
    slug: courseModule.slug,
    title: courseModule.title,
    sortOrder: courseModule.sortOrder,
    course: {
      id: courseModule.course.id,
      slug: courseModule.course.slug,
      title: courseModule.course.title,
      courseCode: courseModule.course.courseCode,
      subject: courseModule.course.subject ?? "ไม่ระบุวิชา",
    },
    lessons: courseModule.lessons.map((lesson) => ({
      id: lesson.id,
      epNumber: lesson.epNumber,
      title: lesson.title,
      description: lesson.description,
      durationSeconds: lesson.durationSeconds,
      completed: Boolean(lesson.progress[0]?.completedAt),
    })),
  };
}

export async function getWatchLessonContext(
  lessonId: string,
  userKey: string = USER_KEY,
  includeUnpublished = false,
): Promise<WatchLessonContext | null> {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      ...(includeUnpublished ? {} : { isPublished: PUBLISHED }),
      course: includeUnpublished ? {} : { isPublished: PUBLISHED },
      chapter: includeUnpublished ? {} : { isPublished: PUBLISHED },
    },
    select: {
      id: true,
      epNumber: true,
      title: true,
      description: true,
      durationSeconds: true,
      course: {
        select: {
          slug: true,
          title: true,
          courseCode: true,
        },
      },
      chapter: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
      progress: {
        where: { userKey },
        select: { completedAt: true },
      },
    },
  });

  if (!lesson) {
    return null;
  }

  const moduleLessons = await prisma.lesson.findMany({
    where: {
      chapterId: lesson.chapter.id,
      ...(includeUnpublished ? {} : { isPublished: PUBLISHED }),
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      epNumber: true,
      title: true,
      description: true,
      durationSeconds: true,
      progress: {
        where: { userKey },
        select: { completedAt: true },
      },
    },
  });

  const lessons = moduleLessons.map((moduleLesson) => ({
    id: moduleLesson.id,
    epNumber: moduleLesson.epNumber,
    title: moduleLesson.title,
    description: moduleLesson.description,
    durationSeconds: moduleLesson.durationSeconds,
    completed: Boolean(moduleLesson.progress[0]?.completedAt),
  }));

  const currentIndex = lessons.findIndex(
    (moduleLesson) => moduleLesson.id === lesson.id,
  );

  return {
    lesson: {
      id: lesson.id,
      epNumber: lesson.epNumber,
      title: lesson.title,
      description: lesson.description,
      durationSeconds: lesson.durationSeconds,
      completed: Boolean(lesson.progress[0]?.completedAt),
    },
    course: lesson.course,
    module: {
      slug: lesson.chapter.slug,
      title: lesson.chapter.title,
    },
    lessons,
    previousLessonId:
      currentIndex > 0 ? lessons[currentIndex - 1]?.id ?? null : null,
    nextLessonId:
      currentIndex >= 0 && currentIndex < lessons.length - 1
        ? lessons[currentIndex + 1]?.id ?? null
        : null,
  };
}
