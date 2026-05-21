import type { HTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

type BadgeVariant =
  | "primary"
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "outline";

type BadgeSize = "sm" | "md";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
};

const variants: Record<BadgeVariant, string> = {
  primary: "bg-primary-50 text-primary-700 ring-primary-100",
  neutral: "bg-surface-muted text-ink-soft ring-line",
  accent: "bg-accent-50 text-accent-700 ring-accent-100",
  success: "bg-success-soft text-success ring-success/15",
  warning: "bg-warning-soft text-warning ring-warning/15",
  danger: "bg-danger-soft text-danger ring-danger/15",
  outline: "bg-transparent text-ink-soft ring-line",
};

const sizes: Record<BadgeSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

export function Badge({
  className,
  variant = "neutral",
  size = "sm",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full font-bold ring-1 ring-inset",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
