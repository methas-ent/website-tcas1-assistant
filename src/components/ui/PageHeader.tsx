import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  tone?: "brand" | "neutral";
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  tone = "brand",
}: PageHeaderProps) {
  return (
    <section
      className={
        tone === "brand"
          ? "border-b border-primary-900/10 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white"
          : "border-b border-line bg-surface text-ink"
      }
    >
      <div className="mx-auto grid max-w-7xl gap-5 px-page py-8 sm:gap-6 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          {eyebrow ? (
            <p
              className={
                tone === "brand"
                  ? "text-xs font-bold uppercase tracking-[0.22em] text-primary-100"
                  : "text-xs font-bold uppercase tracking-[0.22em] text-primary-700"
              }
            >
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p
              className={
                tone === "brand"
                  ? "mt-3 max-w-2xl text-base leading-7 text-primary-50/90"
                  : "mt-3 max-w-2xl text-base leading-7 text-ink-muted"
              }
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-3 sm:justify-end">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}
