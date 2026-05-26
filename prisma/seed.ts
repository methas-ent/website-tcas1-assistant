/**
 * Seed for the VDO Learning Platform Full LMS MVP.
 *
 * Idempotent: re-running this script updates the admin account from env,
 * sample Thai exam-prep catalog content, package membership, and demo progress
 * without creating duplicates.
 *
 * Required env:
 *   ADMIN_EMAIL
 *   ADMIN_PASSWORD
 *
 * Run with:
 *   npx prisma db seed
 */

import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USER_KEY = process.env.DEMO_USER_KEY?.trim() || "demo-user";

const STATUS = {
  UPLOADED: "UPLOADED",
  ADMIN: "ADMIN",
  STUDENT: "STUDENT",
  ACTIVE: "ACTIVE",
} as const;

type LessonSeed = {
  epNumber: number;
  title: string;
  description?: string;
  durationSeconds?: number;
};

type ChapterSeed = {
  slug: string;
  title: string;
  lessons?: LessonSeed[];
};

type CourseSeed = {
  slug: string;
  courseCode: string;
  title: string;
  subject: string;
  subjectCategory: string;
  gradeLevel: string;
  level: string;
  description: string;
  priceCents: number;
  chapters: ChapterSeed[];
};

const COURSES: CourseSeed[] = [
  {
    slug: "math-1-a-level",
    courseCode: "MON94E99_3",
    title: "คณิตศาสตร์ 1 A-Level",
    subject: "คณิตศาสตร์",
    subjectCategory: "Math",
    gradeLevel: "A-Level",
    level: "A-Level",
    description:
      "คอร์สคณิตศาสตร์ 1 ระดับ A-Level ครอบคลุมเซต ตรรกศาสตร์ จำนวนจริง ความสัมพันธ์และฟังก์ชัน เรขาคณิตวิเคราะห์ ภาคตัดกรวย เมทริกซ์ ฟังก์ชันเอกซ์โพเนนเชียลและลอการิทึม ฟังก์ชันตรีโกณมิติ และเวกเตอร์",
    priceCents: 490000,
    chapters: [
      {
        slug: "set",
        title: "เซต",
        lessons: [
          { epNumber: 1, title: "EP 1 บทนำ", durationSeconds: 600 },
          { epNumber: 2, title: "EP 2 แบบฝึกหัด", durationSeconds: 720 },
          { epNumber: 3, title: "EP 3 เฉลยแบบทดสอบ", durationSeconds: 540 },
          { epNumber: 4, title: "EP 4 สมบัติของเซต", durationSeconds: 660 },
          { epNumber: 5, title: "EP 5 การดำเนินการของเซต", durationSeconds: 780 },
          {
            epNumber: 6,
            title: "EP 6 โจทย์ปัญหาเกี่ยวกับจำนวนสมาชิกของเซต",
            durationSeconds: 840,
          },
        ],
      },
      { slug: "logic", title: "ตรรกศาสตร์" },
      { slug: "real-numbers", title: "จำนวนจริง" },
      { slug: "relations-and-functions", title: "ความสัมพันธ์และฟังก์ชัน" },
      { slug: "analytic-geometry", title: "เรขาคณิตวิเคราะห์" },
      { slug: "conic-sections", title: "ภาคตัดกรวย" },
      { slug: "matrices", title: "เมทริกซ์" },
      {
        slug: "exponential-and-logarithmic-functions",
        title: "ฟังก์ชันเอกซ์โพเนนเชียลและลอการิทึม",
      },
      { slug: "trigonometric-functions", title: "ฟังก์ชันตรีโกณมิติ" },
      { slug: "vectors", title: "เวกเตอร์" },
    ],
  },
  {
    slug: "tcas-preparation",
    courseCode: "TCAS-PREP-01",
    title: "เตรียมสอบ TCAS",
    subject: "แนะแนวสอบเข้า",
    subjectCategory: "TCAS",
    gradeLevel: "TCAS",
    level: "TCAS",
    description:
      "คอร์สวางแผนสอบ TCAS สำหรับนักเรียนไทย ครอบคลุมไทม์ไลน์สมัครสอบ การเลือกคณะ และกลยุทธ์เตรียม TGAT/TPAT และ A-Level",
    priceCents: 290000,
    chapters: [
      {
        slug: "tcas-roadmap",
        title: "วางแผน TCAS",
        lessons: [
          { epNumber: 1, title: "EP 1 ภาพรวมระบบ TCAS", durationSeconds: 480 },
          { epNumber: 2, title: "EP 2 วางแผนอ่านหนังสือ", durationSeconds: 540 },
        ],
      },
      {
        slug: "portfolio-and-admission",
        title: "พอร์ตและรอบสมัคร",
        lessons: [
          { epNumber: 1, title: "EP 1 เตรียมพอร์ตให้ตรงคณะ", durationSeconds: 510 },
        ],
      },
      {
        slug: "exam-strategy",
        title: "กลยุทธ์ทำข้อสอบ",
        lessons: [
          { epNumber: 1, title: "EP 1 เทคนิคจัดเวลาในห้องสอบ", durationSeconds: 450 },
        ],
      },
    ],
  },
];

const PACKAGE = {
  slug: "thai-exam-prep-bundle",
  title: "แพ็กเกจเตรียมสอบ A-Level + TCAS",
  description:
    "รวมคอร์สคณิตศาสตร์ A-Level และคอร์สวางแผน TCAS สำหรับเตรียมสอบเข้ามหาวิทยาลัย",
  priceCents: 690000,
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function hashPassword(password: string): string {
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function seedAdmin() {
  const email = requireEnv("ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("ADMIN_PASSWORD");
  const name = process.env.ADMIN_NAME?.trim() || "VDO Admin";
  const passwordHash = hashPassword(password);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      role: STATUS.ADMIN,
    },
    update: {
      name,
      passwordHash,
      role: STATUS.ADMIN,
    },
  });

  console.log(`  admin: ${admin.email}`);
}

async function seedDemoStudent(courseIds: string[]) {
  const email = process.env.DEMO_STUDENT_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_STUDENT_PASSWORD?.trim();

  if (!email || !password) {
    console.log("  demo student: skipped (set DEMO_STUDENT_EMAIL and DEMO_STUDENT_PASSWORD)");
    return;
  }

  const name = process.env.DEMO_STUDENT_NAME?.trim() || "Demo Student";
  const passwordHash = hashPassword(password);
  const student = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      role: STATUS.STUDENT,
    },
    update: {
      name,
      passwordHash,
      role: STATUS.STUDENT,
    },
  });

  for (const courseId of courseIds) {
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: student.id,
          courseId,
        },
      },
      create: {
        userId: student.id,
        courseId,
        status: STATUS.ACTIVE,
      },
      update: {
        status: STATUS.ACTIVE,
        expiresAt: null,
      },
    });
  }

  console.log(`  demo student: ${student.email} (${courseIds.length} enrollments)`);
}

async function seedCourse(courseSeed: CourseSeed) {
  const course = await prisma.course.upsert({
    where: { slug: courseSeed.slug },
    create: {
      slug: courseSeed.slug,
      courseCode: courseSeed.courseCode,
      title: courseSeed.title,
      subject: courseSeed.subject,
      subtitle: courseSeed.level,
      category: courseSeed.subject,
      subjectCategory: courseSeed.subjectCategory,
      gradeLevel: courseSeed.gradeLevel,
      level: courseSeed.level,
      description: courseSeed.description,
      priceCents: courseSeed.priceCents,
      isPublished: true,
    },
    update: {
      courseCode: courseSeed.courseCode,
      title: courseSeed.title,
      subject: courseSeed.subject,
      subtitle: courseSeed.level,
      category: courseSeed.subject,
      subjectCategory: courseSeed.subjectCategory,
      gradeLevel: courseSeed.gradeLevel,
      level: courseSeed.level,
      description: courseSeed.description,
      priceCents: courseSeed.priceCents,
      isPublished: true,
    },
  });

  console.log(`  course: ${course.title}`);

  for (const [chapterIndex, chapterSeed] of courseSeed.chapters.entries()) {
    const chapter = await prisma.chapter.upsert({
      where: {
        courseId_slug: {
          courseId: course.id,
          slug: chapterSeed.slug,
        },
      },
      create: {
        courseId: course.id,
        slug: chapterSeed.slug,
        title: chapterSeed.title,
        sortOrder: chapterIndex + 1,
        isPublished: true,
      },
      update: {
        title: chapterSeed.title,
        sortOrder: chapterIndex + 1,
        isPublished: true,
      },
    });

    console.log(
      `    chapter ${chapter.sortOrder.toString().padStart(2, "0")}: ${chapter.title}`,
    );

    for (const [lessonIndex, lessonSeed] of (chapterSeed.lessons ?? []).entries()) {
      const storageKey = [
        "seed",
        courseSeed.slug,
        chapterSeed.slug,
        `ep-${lessonSeed.epNumber.toString().padStart(3, "0")}.mp4`,
      ].join("/");

      const videoAsset = await prisma.videoAsset.upsert({
        where: { storageKey },
        create: {
          title: lessonSeed.title,
          storageProvider: "LOCAL",
          storageKey,
          originalFileName: storageKey.split("/").at(-1)!,
          mimeType: "video/mp4",
          sizeBytes: BigInt(0),
          status: STATUS.UPLOADED,
          durationSeconds: lessonSeed.durationSeconds,
          metadataJson: JSON.stringify({
            seeded: true,
            note: "Placeholder metadata only; upload a real local file before playback.",
          }),
        },
        update: {
          title: lessonSeed.title,
          originalFileName: storageKey.split("/").at(-1)!,
          mimeType: "video/mp4",
          sizeBytes: BigInt(0),
          status: STATUS.UPLOADED,
          durationSeconds: lessonSeed.durationSeconds,
          metadataJson: JSON.stringify({
            seeded: true,
            note: "Placeholder metadata only; upload a real local file before playback.",
          }),
        },
      });

      const lesson = await prisma.lesson.upsert({
        where: {
          chapterId_epNumber: {
            chapterId: chapter.id,
            epNumber: lessonSeed.epNumber,
          },
        },
        create: {
          courseId: course.id,
          chapterId: chapter.id,
          epNumber: lessonSeed.epNumber,
          title: lessonSeed.title,
          description: lessonSeed.description,
          sortOrder: lessonIndex + 1,
          isPreview: lessonIndex === 0,
          isPublished: true,
          videoAssetId: videoAsset.id,
          durationSeconds: lessonSeed.durationSeconds,
        },
        update: {
          title: lessonSeed.title,
          description: lessonSeed.description,
          sortOrder: lessonIndex + 1,
          isPreview: lessonIndex === 0,
          isPublished: true,
          videoAssetId: videoAsset.id,
          durationSeconds: lessonSeed.durationSeconds,
        },
      });

      console.log(`      lesson EP${lesson.epNumber}: ${lesson.title}`);
    }
  }

  return course;
}

async function seedPackage(courseIds: string[]) {
  const coursePackage = await prisma.coursePackage.upsert({
    where: { slug: PACKAGE.slug },
    create: {
      slug: PACKAGE.slug,
      title: PACKAGE.title,
      description: PACKAGE.description,
      priceCents: PACKAGE.priceCents,
      isPublished: true,
    },
    update: {
      title: PACKAGE.title,
      description: PACKAGE.description,
      priceCents: PACKAGE.priceCents,
      isPublished: true,
    },
  });

  for (const [index, courseId] of courseIds.entries()) {
    await prisma.coursePackageItem.upsert({
      where: {
        packageId_courseId: {
          packageId: coursePackage.id,
          courseId,
        },
      },
      create: {
        packageId: coursePackage.id,
        courseId,
        sortOrder: index + 1,
      },
      update: {
        sortOrder: index + 1,
      },
    });
  }

  console.log(`  package: ${coursePackage.title} (${courseIds.length} courses)`);
}

async function seedDemoProgress(courseId: string) {
  const progress = await prisma.courseProgress.upsert({
    where: {
      userKey_courseId: {
        userKey: DEMO_USER_KEY,
        courseId,
      },
    },
    create: {
      userKey: DEMO_USER_KEY,
      courseId,
      percentComplete: 9,
    },
    update: {
      percentComplete: 9,
    },
  });

  console.log(
    `  progress: ${progress.userKey} -> ${progress.percentComplete}% on first course`,
  );
}

async function main() {
  console.log("Seeding VDO Full LMS MVP data...");

  await seedAdmin();

  const courses = [];
  for (const courseSeed of COURSES) {
    courses.push(await seedCourse(courseSeed));
  }

  await seedPackage(courses.map((course) => course.id));
  await seedDemoProgress(courses[0]!.id);
  await seedDemoStudent(courses.map((course) => course.id));

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
