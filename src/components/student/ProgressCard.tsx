import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/components/ui/cn";

export type ProgressCardProps = {
  title: string;
  value: number;
  description?: string;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function ProgressCard({
  title,
  value,
  description,
  meta,
  action,
  className,
}: ProgressCardProps) {
  return (
    <Card className={cn("min-w-0", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-ink">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        {meta ? <div className="shrink-0 text-sm font-bold text-primary-700">{meta}</div> : null}
      </div>
      <ProgressBar value={value} className="mt-5" />
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
