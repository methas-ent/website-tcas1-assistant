import type { HTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

type CardVariant = "default" | "soft" | "outline" | "danger";
type CardPadding = "none" | "sm" | "md" | "lg";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
};

const cardVariants: Record<CardVariant, string> = {
  default: "border-line bg-surface shadow-card",
  soft: "border-line bg-surface-soft shadow-sm",
  outline: "border-line bg-transparent shadow-none",
  danger: "border-primary-200 bg-danger-soft shadow-sm",
};

const cardPadding: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-5",
  lg: "p-6 sm:p-7",
};

export function Card({
  className,
  variant = "default",
  padding = "md",
  interactive,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border",
        cardVariants[variant],
        cardPadding[padding],
        interactive &&
          "motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-raised active:scale-[0.99]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-heading text-lg font-bold text-ink", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm leading-6 text-ink-muted", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-5", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-5 flex flex-wrap items-center gap-3", className)}
      {...props}
    />
  );
}
