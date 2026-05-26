"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { useAdminPreferences } from "@/components/admin/useAdminPreferences";
import { cn } from "@/components/ui/cn";
import { translateAdminText } from "@/lib/admin-translations";

export type PublicNavItem = {
  href: string;
  label: string;
  active?: boolean;
};

type PublicHeaderNavProps = {
  navItems: PublicNavItem[];
  className?: string;
};

function normalizePath(path: string) {
  return path.split("?")[0] || "/";
}

function isActivePath(pathname: string | null, href: string, fallback?: boolean) {
  if (!pathname) {
    return Boolean(fallback);
  }

  const path = normalizePath(href);

  if (path === "/") {
    return pathname === "/";
  }

  if (path === "/cart") {
    return pathname === "/cart" || pathname === "/checkout";
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

function isPrimaryClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function PublicHeaderNav({ navItems, className }: PublicHeaderNavProps) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const { language } = useAdminPreferences();

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav className={className} aria-label="เมนูหลัก">
      {navItems.map((item) => {
        const isActive = isActivePath(pathname, item.href, item.active);
        const isPending = pendingHref === item.href && !isActive;
        const label =
          language === "en" ? translateAdminText(item.label) : item.label;

        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={(event) => {
              if (isPrimaryClick(event)) {
                setPendingHref(item.href);
              }
            }}
            className={cn(
              "min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold",
              "transition-[background-color,color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              isActive
                ? "bg-primary text-white shadow-sm"
                : isPending
                  ? "bg-primary-50 text-primary-700 ring-1 ring-primary-100"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink motion-safe:hover:-translate-y-0.5",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
