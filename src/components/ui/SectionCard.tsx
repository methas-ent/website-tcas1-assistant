import type { HTMLAttributes } from "react";

type SectionCardProps = HTMLAttributes<HTMLDivElement>;

export function SectionCard({
  className,
  children,
  ...props
}: SectionCardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-line bg-surface shadow-card",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
