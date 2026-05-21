import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

type EmptyStateTone = "neutral" | "primary" | "danger";

export type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: EmptyStateTone;
  className?: string;
};

const iconTones: Record<EmptyStateTone, string> = {
  neutral: "bg-surface-muted text-ink-muted",
  primary: "bg-primary-50 text-primary-700",
  danger: "bg-danger-soft text-danger",
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  tone = "neutral",
  className,
}: EmptyStateProps) {
  return (
    <Card
      variant="outline"
      className={cn(
        "grid place-items-center border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <div
          className={cn(
            "mb-4 grid h-12 w-12 place-items-center rounded-2xl",
            iconTones[tone],
          )}
        >
          {icon}
        </div>
      ) : null}
      <h3 className="font-heading text-lg font-bold text-ink">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
