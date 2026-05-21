import Image from "next/image";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

export type ProductCardProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  imageSrc?: string | null;
  imageAlt?: string;
  href?: string;
  actionLabel?: string;
  priceLabel?: string;
  badges?: string[];
  meta?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function ProductCard({
  title,
  description,
  eyebrow,
  imageSrc,
  imageAlt,
  href,
  actionLabel = "ดูรายละเอียด",
  priceLabel,
  badges = [],
  meta,
  footer,
  className,
}: ProductCardProps) {
  return (
    <Card
      padding="none"
      interactive={Boolean(href)}
      className={cn("overflow-hidden", className)}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary-50 via-surface to-accent-50">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt ?? title}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
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
      <div className="flex min-h-[240px] flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          {eyebrow ? <Badge variant="primary">{eyebrow}</Badge> : null}
          {badges.map((badge) => (
            <Badge key={badge} variant="neutral">
              {badge}
            </Badge>
          ))}
        </div>
        <h3 className="mt-4 font-heading text-xl font-bold text-ink">{title}</h3>
        {description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-muted">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-4 text-sm text-ink-soft">{meta}</div> : null}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
          {priceLabel ? (
            <p className="font-heading text-lg font-bold text-primary-700">
              {priceLabel}
            </p>
          ) : (
            <span />
          )}
          {href ? (
            <ButtonLink href={href} size="sm">
              {actionLabel}
            </ButtonLink>
          ) : null}
        </div>
        {footer ? <div className="mt-4 border-t border-line pt-4">{footer}</div> : null}
      </div>
    </Card>
  );
}
