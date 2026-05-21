"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import type { AdminShellNavItem } from "@/components/admin/AdminShell";
import { cn } from "@/components/ui/cn";

type AdminShellNavProps = {
  items: AdminShellNavItem[];
};

function normalizePath(path: string) {
  return path.split("?")[0] || "/";
}

function isActivePath(pathname: string | null, href: string, fallback?: boolean) {
  if (!pathname) {
    return Boolean(fallback);
  }

  const path = normalizePath(href);

  if (path === "/admin") {
    return pathname === "/admin";
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

export function AdminShellNav({ items }: AdminShellNavProps) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav
      className="flex snap-x gap-2 overflow-x-auto px-page pb-4 lg:grid lg:gap-1.5 lg:overflow-visible lg:px-3 lg:pb-5"
      aria-label="เมนูผู้ดูแล"
    >
      {items.map((item) => {
        const isActive = isActivePath(pathname, item.href, item.active);
        const isPending = pendingHref === item.href && !isActive;

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
              "group flex min-h-11 snap-start items-center justify-between gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold",
              "transition-[background-color,color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              isActive
                ? "bg-primary text-white shadow-sm"
                : isPending
                  ? "bg-primary-50 text-primary-700 ring-1 ring-primary-100"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink motion-safe:hover:translate-x-0.5",
            )}
          >
            <span>{item.label}</span>
            {item.badge ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs transition-colors duration-200",
                  isActive ? "bg-white/20 text-white" : "bg-primary-50 text-primary-700",
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
