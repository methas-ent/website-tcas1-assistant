"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import type { AdminShellNavItem } from "@/components/admin/AdminShell";
import { cn } from "@/components/ui/cn";
import { translateAdminText } from "@/lib/admin-translations";
import { useAdminPreferences } from "@/components/admin/useAdminPreferences";

type AdminShellNavProps = {
  items: AdminShellNavItem[];
};

function normalizePath(path: string) {
  return path.split("?")[0] || "/";
}

function isActivePath(pathname: string | null, href: string, fallback?: boolean) {
  if (fallback) {
    return true;
  }

  if (!pathname) {
    return false;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const { language } = useAdminPreferences();

  useEffect(() => {
    setPendingHref(null);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const menuLabel = language === "en" ? "Menu" : "เมนู";

  return (
    <div className="px-page pb-4 lg:px-3 lg:pb-5">
      <button
        aria-controls="admin-primary-nav"
        aria-expanded={menuOpen}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 text-sm font-black text-ink shadow-sm transition duration-200 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:hidden"
        onClick={() => setMenuOpen((value) => !value)}
        type="button"
      >
        <span>{menuLabel}</span>
        <span className="grid gap-1" aria-hidden="true">
          <span
            className={cn(
              "block h-0.5 w-5 rounded-full bg-current transition-transform duration-200",
              menuOpen && "translate-y-1.5 rotate-45",
            )}
          />
          <span
            className={cn(
              "block h-0.5 w-5 rounded-full bg-current transition-opacity duration-200",
              menuOpen && "opacity-0",
            )}
          />
          <span
            className={cn(
              "block h-0.5 w-5 rounded-full bg-current transition-transform duration-200",
              menuOpen && "-translate-y-1.5 -rotate-45",
            )}
          />
        </span>
      </button>

      <nav
        id="admin-primary-nav"
        className={cn(
          "grid overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out motion-reduce:transition-none",
          menuOpen
            ? "mt-3 max-h-96 translate-y-0 opacity-100"
            : "max-h-0 -translate-y-1 opacity-0",
          "lg:mt-0 lg:max-h-none lg:translate-y-0 lg:gap-1.5 lg:overflow-visible lg:opacity-100",
        )}
        aria-label={language === "en" ? "Admin navigation" : "เมนูผู้ดูแล"}
      >
        <div className="grid gap-1.5 rounded-2xl border border-line bg-surface p-2 shadow-card lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          {items.map((item) => {
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
                    setMenuOpen(false);
                  }
                }}
                className={cn(
                  "group relative flex min-h-11 items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-bold",
                  "transition-[background-color,color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : isPending
                      ? "bg-primary-50 text-primary-700 ring-1 ring-primary-100"
                      : "text-ink-muted hover:bg-primary-50 hover:text-primary-700 motion-safe:hover:translate-x-0.5",
                )}
              >
                <span>{label}</span>
                {item.badge ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs transition-colors duration-200",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-primary-50 text-primary-700",
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
