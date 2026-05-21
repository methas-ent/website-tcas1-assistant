import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/components/ui/cn";

export type StudentCourseCardProps = {
  title: string;
  courseCode?: string;
  subject?: string;
  description?: string;
  level?: string;
  coverImageUrl?: string | null;
  progressPercent?: number;
  moduleCount?: number;
  lessonCount?: number;
  durationLabel?: string;
  expiresLabel?: string;
  href?: string;
  actionLabel?: string;
  className?: string;
};

export function CourseCard({
  title,
  courseCode,
  subject,
  description,
  level,
  coverImageUrl,
  progressPercent = 0,
  moduleCount,
  lessonCount,
  durationLabel,
  expiresLabel,
  href,
  actionLabel = "เข้าเรียน",
  className,
}: StudentCourseCardProps) {
  return (
    <Card
      padding="none"
      interactive={Boolean(href)}
      className={cn(
        "grid overflow-hidden sm:grid-cols-[220px_1fr]",
        className,
      )}
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-primary-50 via-surface to-accent-50 sm:aspect-auto">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={`${title} cover`}
            fill
            sizes="(min-width: 768px) 220px, 100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <span className="rounded-2xl bg-primary px-4 py-3 font-heading text-lg font-black text-white shadow-card">
              VDO
            </span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4 p-5">
        <div>
          <div className="flex flex-wrap gap-2">
            {courseCode ? <Badge variant="danger">{courseCode}</Badge> : null}
            {level ? <Badge variant="accent">{level}</Badge> : null}
          </div>
          <h3 className="mt-3 font-heading text-xl font-bold text-ink">
            {title}
          </h3>
          {subject ? <p className="mt-1 text-sm text-ink-muted">{subject}</p> : null}
          {description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        <ProgressBar value={progressPercent} />
        <dl className="grid gap-2 text-sm text-ink-muted sm:grid-cols-3">
          <div className="rounded-2xl bg-surface-muted p-3">
            <dt className="font-bold text-ink">โมดูล</dt>
            <dd>{typeof moduleCount === "number" ? `${moduleCount} บท` : "-"}</dd>
          </div>
          <div className="rounded-2xl bg-surface-muted p-3">
            <dt className="font-bold text-ink">บทเรียน</dt>
            <dd>{typeof lessonCount === "number" ? `${lessonCount} EP` : "-"}</dd>
          </div>
          <div className="rounded-2xl bg-surface-muted p-3">
            <dt className="font-bold text-ink">เวลาเรียน</dt>
            <dd>{durationLabel ?? "-"}</dd>
          </div>
        </dl>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          {expiresLabel ? (
            <p className="text-xs font-semibold text-ink-muted">{expiresLabel}</p>
          ) : (
            <span />
          )}
          {href ? <ButtonLink href={href}>{actionLabel}</ButtonLink> : null}
        </div>
      </div>
    </Card>
  );
}
