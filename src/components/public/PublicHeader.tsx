import Link from "next/link";
import type { ReactNode } from "react";
import { PublicHeaderNav } from "@/components/public/PublicHeaderNav";
import type { PublicNavItem } from "@/components/public/PublicHeaderNav";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

export type PublicHeaderProps = {
  navItems?: PublicNavItem[];
  actions?: ReactNode;
  cartCount?: number;
  className?: string;
};

const defaultNavItems: PublicNavItem[] = [
  { href: "/", label: "หน้าแรก" },
  { href: "/courses", label: "คอร์ส/แพ็กเกจ" },
  { href: "/cart", label: "ตะกร้า" },
];

export function PublicHeader({
  navItems = defaultNavItems,
  actions,
  cartCount,
  className,
}: PublicHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-page py-3 md:flex-nowrap md:gap-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-2xl transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary font-heading text-sm font-black text-white shadow-card">
            VDO
          </span>
          <span className="min-w-0">
            <span className="block font-heading text-base font-bold text-ink">
              VDO Knowledge Academy
            </span>
            <span className="hidden text-xs text-ink-muted sm:block">
              ระบบเรียนออนไลน์
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {typeof cartCount === "number" ? (
            <ButtonLink href="/cart" variant="outline" size="sm">
              ตะกร้า
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                {cartCount}
              </span>
            </ButtonLink>
          ) : null}
          {actions}
        </div>
        <PublicHeaderNav
          navItems={navItems}
          className="order-3 flex w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface-soft p-1 md:order-none md:w-auto md:overflow-visible md:border-0 md:bg-transparent md:p-0"
        />
      </div>
    </header>
  );
}
