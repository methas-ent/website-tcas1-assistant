import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

export type CoursePackageCardProps = {
  title: string;
  description?: string;
  priceLabel?: string;
  courseCount?: number;
  lessonCount?: number;
  durationLabel?: string;
  href?: string;
  actionLabel?: string;
  featured?: boolean;
  highlights?: string[];
  footer?: ReactNode;
  className?: string;
};

export function CoursePackageCard({
  title,
  description,
  priceLabel,
  courseCount,
  lessonCount,
  durationLabel,
  href,
  actionLabel = "เลือกแพ็กเกจ",
  featured,
  highlights = [],
  footer,
  className,
}: CoursePackageCardProps) {
  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden",
        featured && "border-primary-200 ring-2 ring-primary-100",
        className,
      )}
      interactive={Boolean(href)}
    >
      {featured ? (
        <div className="absolute right-5 top-5">
          <Badge variant="primary">แนะนำ</Badge>
        </div>
      ) : null}
      <div className="pr-16 sm:pr-20">
        <Badge variant="accent">Package</Badge>
        <h3 className="mt-4 font-heading text-xl font-bold text-ink sm:text-2xl">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
        ) : null}
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
        <div className="rounded-2xl bg-surface-muted p-2 transition-colors duration-200 group-hover:bg-primary-50 sm:p-3">
          <dt className="text-ink-muted">คอร์ส</dt>
          <dd className="mt-1 font-heading text-lg font-black text-ink">
            {courseCount ?? "-"}
          </dd>
        </div>
        <div className="rounded-2xl bg-surface-muted p-2 transition-colors duration-200 group-hover:bg-primary-50 sm:p-3">
          <dt className="text-ink-muted">บทเรียน</dt>
          <dd className="mt-1 font-heading text-lg font-black text-ink">
            {lessonCount ?? "-"}
          </dd>
        </div>
        <div className="rounded-2xl bg-surface-muted p-2 transition-colors duration-200 group-hover:bg-primary-50 sm:p-3">
          <dt className="text-ink-muted">เวลา</dt>
          <dd className="mt-1 font-heading text-sm font-black text-ink">
            {durationLabel ?? "-"}
          </dd>
        </div>
      </dl>
      {highlights.length > 0 ? (
        <ul className="mt-5 space-y-2 text-sm text-ink-soft">
          {highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto flex flex-col items-stretch gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        {priceLabel ? (
          <p className="font-heading text-2xl font-bold text-primary-700">
            {priceLabel}
          </p>
        ) : (
          <span />
        )}
        {href ? (
          <ButtonLink href={href} className="w-full sm:w-auto">
            {actionLabel}
          </ButtonLink>
        ) : null}
      </div>
      {footer ? (
        <div className="mt-5 grid border-t border-line pt-5 sm:block">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
