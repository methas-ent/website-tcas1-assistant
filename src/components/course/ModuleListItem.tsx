import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatDuration } from "@/lib/catalog/queries";

type ModuleListItemProps = {
  href: string;
  sortOrder: number;
  title: string;
  lessonCount: number;
  completedLessonCount: number;
  totalDurationSeconds: number;
};

export function ModuleListItem({
  href,
  sortOrder,
  title,
  lessonCount,
  completedLessonCount,
  totalDurationSeconds,
}: ModuleListItemProps) {
  const progress =
    lessonCount > 0 ? Math.round((completedLessonCount / lessonCount) * 100) : 0;

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-primary-100 bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-50 text-sm font-black text-primary-700">
          {sortOrder.toString().padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-ink">{title}</h3>
              <p className="mt-1 text-sm text-ink-muted">
                {lessonCount} EP · {formatDuration(totalDurationSeconds)}
              </p>
            </div>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white transition group-hover:bg-primary-600">
              →
            </span>
          </div>
          <div className="mt-4">
            <ProgressBar value={progress} label="เรียนแล้ว" />
          </div>
        </div>
      </div>
    </Link>
  );
}
