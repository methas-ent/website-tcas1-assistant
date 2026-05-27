import { redirect } from "next/navigation";
import { getCurrentUser, isStudent, type CurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";

const ACTIVE_ENROLLMENT = "ACTIVE";
const PUBLISHED = true;

type ProgressRecord = {
  completedAt: Date | null;
  progressSeconds: number;
};

type LessonForProgress = {
  id: string;
  durationSeconds: number | null;
  progress: ProgressRecord[];
};

export type StudentCourseListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  courseCode: string;
  coverImageUrl: string | null;
  progressPercent: number;
  chapterCount: number;
  lessonCount: number;
  totalDurationSeconds: number;
  completedLessonCount: number;
  expiresAt: Date | null;
  continueLessonId: string | null;
};

export type StudentLessonListItem = {
  id: string;
  epNumber: number;
  title: string;
  description: string | null;
  durationSeconds: number | null;
  durationLabel: string;
  completed: boolean;
  progressSeconds: number;
  isPreview: boolean;
  locked: boolean;
};

export type StudentChapterDetail = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessonCount: number;
  completedLessonCount: number;
  totalDurationSeconds: number;
  lessons: StudentLessonListItem[];
};

export type StudentCourseDetail = StudentCourseListItem & {
  subtitle: string;
  chapters: StudentChapterDetail[];
};

export type StudentCourseAccess =
  | { status: "ready"; course: StudentCourseDetail }
  | {
      status: "denied";
      course: {
        id: string;
        slug: string;
        title: string;
        description: string;
      };
    }
  | { status: "missing" };

export type StudentLessonAccessSource = "ENROLLMENT" | "PAY_TIME";

export type StudentLessonContext = {
  lesson: StudentLessonListItem;
  course: {
    id: string;
    slug: string;
    title: string;
    courseCode: string;
    subject: string;
  };
  chapter: {
    id: string;
    title: string;
    sortOrder: number;
  };
  chapters: StudentChapterDetail[];
  previousLessonId: string | null;
  nextLessonId: string | null;
  /**
   * How this student earned access to this lesson on this request:
   *   - "ENROLLMENT" — normal active enrollment on the course.
   *   - "PAY_TIME"   — fallback via an APPROVED Pay Time extension. In
   *                    this mode the context exposes ONLY the paid lesson
   *                    (no siblings, no other chapters) so the UI doesn't
   *                    accidentally suggest free access to neighbours.
   */
  accessSource: StudentLessonAccessSource;
  /**
   * For "PAY_TIME" only: when the active extension expires. Lets the UI
   * render a banner like "เวลาดู Pay Time เหลือ X ชั่วโมง".
   * `null` for "ENROLLMENT".
   */
  payTimeExpiresAt: Date | null;
};

export async function requireStudent(
  nextPath = "/student/my-courses",
): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isStudent(user)) {
    redirect(user.role === "ADMIN" ? "/admin" : "/");
  }

  return user;
}

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

export function formatShortDate(date: Date | null | undefined): string | null {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(date);
}

function enrollmentWhere(userId: string) {
  return {
    userId,
    status: ACTIVE_ENROLLMENT,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
}

function normalizeCourseText(course: {
  subtitle?: string | null;
  description?: string | null;
  subject?: string | null;
  category?: string | null;
  subjectCategory?: string | null;
  level?: string | null;
  gradeLevel?: string | null;
}) {
  return {
    description:
      course.subtitle?.trim() || course.description?.trim() || "ยังไม่มีคำอธิบายคอร์ส",
    subject:
      course.subject?.trim() ||
      course.category?.trim() ||
      course.subjectCategory?.trim() ||
      "คอร์สออนไลน์",
    level:
      course.level?.trim() || course.gradeLevel?.trim() || "เรียนออนไลน์",
  };
}

function getProgressSummary(lessons: LessonForProgress[]) {
  const completedLessons = lessons.filter((lesson) => lesson.progress[0]?.completedAt);
  const progressPercent =
    lessons.length > 0
      ? Math.round((completedLessons.length / lessons.length) * 100)
      : 0;
  const continueLesson =
    lessons.find((lesson) => !lesson.progress[0]?.completedAt) ?? lessons[0] ?? null;

  return {
    completedLessonCount: completedLessons.length,
    progressPercent,
    continueLessonId: continueLesson?.id ?? null,
  };
}

export async function getStudentCourses(
  userId: string,
): Promise<StudentCourseListItem[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      ...enrollmentWhere(userId),
      course: { isPublished: PUBLISHED },
    },
    orderBy: { createdAt: "desc" },
    select: {
      expiresAt: true,
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          subtitle: true,
          description: true,
          subject: true,
          category: true,
          subjectCategory: true,
          level: true,
          gradeLevel: true,
          courseCode: true,
          coverImageUrl: true,
          chapters: {
            where: { isPublished: PUBLISHED },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              lessons: {
                where: { isPublished: PUBLISHED },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                select: {
                  id: true,
                  durationSeconds: true,
                  progress: {
                    where: { userId },
                    select: { completedAt: true, progressSeconds: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return enrollments.map((enrollment) => {
    const course = enrollment.course;
    const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
    const progress = getProgressSummary(lessons);
    const normalized = normalizeCourseText(course);

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: normalized.description,
      subject: normalized.subject,
      level: normalized.level,
      courseCode: course.courseCode,
      coverImageUrl: course.coverImageUrl,
      chapterCount: course.chapters.length,
      lessonCount: lessons.length,
      totalDurationSeconds: lessons.reduce(
        (sum, lesson) => sum + (lesson.durationSeconds ?? 0),
        0,
      ),
      completedLessonCount: progress.completedLessonCount,
      progressPercent: progress.progressPercent,
      expiresAt: enrollment.expiresAt,
      continueLessonId: progress.continueLessonId,
    };
  });
}

export async function getStudentCourseAccess(
  userId: string,
  courseId: string,
): Promise<StudentCourseAccess> {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      ...enrollmentWhere(userId),
      courseId,
      course: { isPublished: PUBLISHED },
    },
    select: {
      expiresAt: true,
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          subtitle: true,
          description: true,
          subject: true,
          category: true,
          subjectCategory: true,
          level: true,
          gradeLevel: true,
          courseCode: true,
          coverImageUrl: true,
          chapters: {
            where: { isPublished: PUBLISHED },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              title: true,
              description: true,
              sortOrder: true,
              lessons: {
                where: { isPublished: PUBLISHED },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                select: {
                  id: true,
                  epNumber: true,
                  title: true,
                  description: true,
                  durationSeconds: true,
                  isPreview: true,
                  progress: {
                    where: { userId },
                    select: { completedAt: true, progressSeconds: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!enrollment) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        isPublished: true,
      },
    });

    if (!course || !course.isPublished) {
      return { status: "missing" };
    }

    return {
      status: "denied",
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
      },
    };
  }

  const course = enrollment.course;
  const normalized = normalizeCourseText(course);
  const chapters = course.chapters.map((chapter): StudentChapterDetail => {
    const lessons = chapter.lessons.map((lesson): StudentLessonListItem => ({
      id: lesson.id,
      epNumber: lesson.epNumber,
      title: lesson.title,
      description: lesson.description,
      durationSeconds: lesson.durationSeconds,
      durationLabel: formatDuration(lesson.durationSeconds),
      completed: Boolean(lesson.progress[0]?.completedAt),
      progressSeconds: lesson.progress[0]?.progressSeconds ?? 0,
      isPreview: lesson.isPreview,
      locked: false,
    }));

    return {
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      sortOrder: chapter.sortOrder,
      lessonCount: lessons.length,
      completedLessonCount: lessons.filter((lesson) => lesson.completed).length,
      totalDurationSeconds: lessons.reduce(
        (sum, lesson) => sum + (lesson.durationSeconds ?? 0),
        0,
      ),
      lessons,
    };
  });
  const lessons = chapters.flatMap((chapter) =>
    chapter.lessons.map((lesson) => ({
      id: lesson.id,
      durationSeconds: lesson.durationSeconds,
      progress: [
        {
          completedAt: lesson.completed ? new Date() : null,
          progressSeconds: lesson.progressSeconds,
        },
      ],
    })),
  );
  const progress = getProgressSummary(lessons);

  return {
    status: "ready",
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      description: normalized.description,
      subject: normalized.subject,
      level: normalized.level,
      courseCode: course.courseCode,
      coverImageUrl: course.coverImageUrl,
      chapterCount: chapters.length,
      lessonCount: lessons.length,
      totalDurationSeconds: lessons.reduce(
        (sum, lesson) => sum + (lesson.durationSeconds ?? 0),
        0,
      ),
      completedLessonCount: progress.completedLessonCount,
      progressPercent: progress.progressPercent,
      expiresAt: enrollment.expiresAt,
      continueLessonId: progress.continueLessonId,
      chapters,
    },
  };
}

export async function getStudentLessonContext(
  userId: string,
  lessonId: string,
): Promise<StudentLessonContext | null> {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      isPublished: PUBLISHED,
      chapter: { isPublished: PUBLISHED },
      course: {
        isPublished: PUBLISHED,
        enrollments: { some: enrollmentWhere(userId) },
      },
    },
    select: {
      id: true,
      courseId: true,
    },
  });

  if (!lesson) {
    // No active enrollment grants access. Before giving up, check whether
    // an APPROVED PayTimeOrder gave this user a still-active
    // `VideoAccessExtension` for this lesson. Pay Time is *supplemental*:
    // we expose ONLY this lesson — no siblings, no unpublished modules.
    return getStudentLessonContextFromPayTime(userId, lessonId);
  }

  const course = await prisma.course.findFirst({
    where: {
      id: lesson.courseId,
      isPublished: PUBLISHED,
      enrollments: { some: enrollmentWhere(userId) },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      courseCode: true,
      subject: true,
      category: true,
      subjectCategory: true,
      chapters: {
        where: { isPublished: PUBLISHED },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          sortOrder: true,
          lessons: {
            where: { isPublished: PUBLISHED },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              epNumber: true,
              title: true,
              description: true,
              durationSeconds: true,
              isPreview: true,
              progress: {
                where: { userId },
                select: { completedAt: true, progressSeconds: true },
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

  const chapters = course.chapters.map((chapter): StudentChapterDetail => {
    const lessons = chapter.lessons.map((courseLesson): StudentLessonListItem => ({
      id: courseLesson.id,
      epNumber: courseLesson.epNumber,
      title: courseLesson.title,
      description: courseLesson.description,
      durationSeconds: courseLesson.durationSeconds,
      durationLabel: formatDuration(courseLesson.durationSeconds),
      completed: Boolean(courseLesson.progress[0]?.completedAt),
      progressSeconds: courseLesson.progress[0]?.progressSeconds ?? 0,
      isPreview: courseLesson.isPreview,
      locked: false,
    }));

    return {
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      sortOrder: chapter.sortOrder,
      lessonCount: lessons.length,
      completedLessonCount: lessons.filter((courseLesson) => courseLesson.completed)
        .length,
      totalDurationSeconds: lessons.reduce(
        (sum, courseLesson) => sum + (courseLesson.durationSeconds ?? 0),
        0,
      ),
      lessons,
    };
  });
  const allLessons = chapters.flatMap((chapter) => chapter.lessons);
  const currentLesson = allLessons.find((courseLesson) => courseLesson.id === lessonId);

  if (!currentLesson) {
    return null;
  }

  const currentChapter = chapters.find((chapter) =>
    chapter.lessons.some((courseLesson) => courseLesson.id === lessonId),
  );
  const currentIndex = allLessons.findIndex((courseLesson) => courseLesson.id === lessonId);
  const subject =
    course.subject?.trim() ||
    course.category?.trim() ||
    course.subjectCategory?.trim() ||
    "คอร์สออนไลน์";

  return {
    lesson: currentLesson,
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      courseCode: course.courseCode,
      subject,
    },
    chapter: {
      id: currentChapter?.id ?? "",
      title: currentChapter?.title ?? "",
      sortOrder: currentChapter?.sortOrder ?? 0,
    },
    chapters,
    previousLessonId:
      currentIndex > 0 ? allLessons[currentIndex - 1]?.id ?? null : null,
    nextLessonId:
      currentIndex >= 0 && currentIndex < allLessons.length - 1
        ? allLessons[currentIndex + 1]?.id ?? null
        : null,
    accessSource: "ENROLLMENT",
    payTimeExpiresAt: null,
  };
}

/**
 * Degraded context loader used when the user has no active enrollment but
 * does have an APPROVED Pay Time extension (`VideoAccessExtension.expiresAt
 * > now`). Returns a single-lesson context — `chapters` contains exactly
 * one chapter with exactly one lesson (the paid one). Neighbour navigation
 * (`previousLessonId` / `nextLessonId`) is intentionally null so the UI
 * can't trick a Pay Time user into thinking adjacent lessons are unlocked.
 *
 * Required for `student/lessons/[lessonId]/page.tsx` to render without
 * crashing when the user reaches the page after their enrollment expired.
 */
async function getStudentLessonContextFromPayTime(
  userId: string,
  lessonId: string,
): Promise<StudentLessonContext | null> {
  const extension = await prisma.videoAccessExtension.findFirst({
    where: {
      userId,
      lessonId,
      expiresAt: { gt: new Date() },
      status: { not: "REVOKED" },
    },
    orderBy: { expiresAt: "desc" },
    select: { expiresAt: true },
  });

  if (!extension) {
    return null;
  }

  // Pay Time still respects publish flags — an unpublished lesson stays
  // locked even with a valid extension.
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      isPublished: PUBLISHED,
      chapter: { isPublished: PUBLISHED },
      course: { isPublished: PUBLISHED },
    },
    select: {
      id: true,
      epNumber: true,
      title: true,
      description: true,
      durationSeconds: true,
      isPreview: true,
      progress: {
        where: { userId },
        select: { completedAt: true, progressSeconds: true },
      },
      chapter: {
        select: {
          id: true,
          title: true,
          description: true,
          sortOrder: true,
        },
      },
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          courseCode: true,
          subject: true,
          category: true,
          subjectCategory: true,
        },
      },
    },
  });

  if (!lesson) {
    return null;
  }

  const lessonItem: StudentLessonListItem = {
    id: lesson.id,
    epNumber: lesson.epNumber,
    title: lesson.title,
    description: lesson.description,
    durationSeconds: lesson.durationSeconds,
    durationLabel: formatDuration(lesson.durationSeconds),
    completed: Boolean(lesson.progress[0]?.completedAt),
    progressSeconds: lesson.progress[0]?.progressSeconds ?? 0,
    isPreview: lesson.isPreview,
    locked: false,
  };
  const chapterDetail: StudentChapterDetail = {
    id: lesson.chapter.id,
    title: lesson.chapter.title,
    description: lesson.chapter.description,
    sortOrder: lesson.chapter.sortOrder,
    lessonCount: 1,
    completedLessonCount: lessonItem.completed ? 1 : 0,
    totalDurationSeconds: lessonItem.durationSeconds ?? 0,
    lessons: [lessonItem],
  };
  const subject =
    lesson.course.subject?.trim() ||
    lesson.course.category?.trim() ||
    lesson.course.subjectCategory?.trim() ||
    "คอร์สออนไลน์";

  return {
    lesson: lessonItem,
    course: {
      id: lesson.course.id,
      slug: lesson.course.slug,
      title: lesson.course.title,
      courseCode: lesson.course.courseCode,
      subject,
    },
    chapter: {
      id: lesson.chapter.id,
      title: lesson.chapter.title,
      sortOrder: lesson.chapter.sortOrder,
    },
    chapters: [chapterDetail],
    previousLessonId: null,
    nextLessonId: null,
    accessSource: "PAY_TIME",
    payTimeExpiresAt: extension.expiresAt,
  };
}

export async function canStudentAccessLesson(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      isPublished: PUBLISHED,
      chapter: { isPublished: PUBLISHED },
      course: {
        isPublished: PUBLISHED,
        enrollments: { some: enrollmentWhere(userId) },
      },
    },
    select: {
      id: true,
      courseId: true,
    },
  });

  return lesson;
}
