import Link from "next/link";
import { CourseCover } from "@/components/course/CourseCover";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { CourseSummary } from "@/lib/catalog/queries";
import { formatDuration } from "@/lib/catalog/queries";

type CourseCardProps = {
  course: CourseSummary;
};

export function CourseCard({ course }: CourseCardProps) {
  return (
    <article className="grid overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg sm:grid-cols-[220px_1fr]">
      <CourseCover
        title={course.title}
        subject={course.subject}
        src={course.coverImageUrl}
      />
      <div className="flex min-w-0 flex-col gap-4 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
              {course.courseCode}
            </span>
            <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              {course.level}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-ink">
            {course.title}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{course.subject}</p>
        </div>

        <ProgressBar value={course.progressPercent} />

        <dl className="grid gap-3 text-sm text-ink-muted sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-ink">โมดูล</dt>
            <dd>{course.moduleCount} บท</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">บทเรียน</dt>
            <dd>{course.lessonCount} EP</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">เวลาเรียน</dt>
            <dd>{formatDuration(course.totalDurationSeconds)}</dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-ink-muted">
            ใช้สิทธิ์ 220 ชั่วโมง 18 นาที 10 วินาที
          </p>
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            เลือก
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
