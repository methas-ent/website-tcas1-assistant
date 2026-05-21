import Link from "next/link";
import { formatDuration, type LessonListItem } from "@/lib/catalog/queries";

type EpisodeRowProps = {
  lesson: LessonListItem;
};

export function EpisodeRow({ lesson }: EpisodeRowProps) {
  return (
    <article className="rounded-2xl border border-primary-100 bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-50 text-sm font-black text-primary-700">
            EP{lesson.epNumber}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">{lesson.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-surface-muted px-3 py-1 text-ink-muted">
                {formatDuration(lesson.durationSeconds)}
              </span>
              <span
                className={
                  lesson.completed
                    ? "rounded-full bg-green-50 px-3 py-1 text-green-700"
                    : "rounded-full bg-primary-50 px-3 py-1 text-primary-700"
                }
              >
                {lesson.completed ? "เรียนจบแล้ว" : "ต้องมีสิทธิ์เรียน"}
              </span>
            </div>
          </div>
        </div>
        <Link
          href={`/student/lessons/${lesson.id}`}
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          ตรวจสิทธิ์เข้าเรียน
          <span className="ml-2" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}
