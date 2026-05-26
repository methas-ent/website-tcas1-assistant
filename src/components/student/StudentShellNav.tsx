"use client";

import Link from "next/link";
import { useAdminPreferences } from "@/components/admin/useAdminPreferences";
import { cn } from "@/components/ui/cn";
import { translateAdminText } from "@/lib/admin-translations";
import type { StudentShellNavItem } from "@/components/student/StudentShell";

export type StudentShellNavProps = {
  navItems: StudentShellNavItem[];
};

export function StudentShellNav({ navItems }: StudentShellNavProps) {
  const { language } = useAdminPreferences();

  return (
    <nav
      className="flex gap-2 overflow-x-auto rounded-2xl border border-line bg-surface p-2 shadow-sm scroll-smooth transition-colors duration-300 [-ms-overflow-style:none] [scrollbar-width:none] lg:grid lg:overflow-visible [&::-webkit-scrollbar]:hidden"
      aria-label={language === "en" ? "Student menu" : "เมนูนักเรียน"}
    >
      {navItems.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 motion-reduce:transition-none",
            item.active
              ? "bg-primary text-white shadow-sm"
              : "text-ink-muted hover:bg-surface-muted hover:text-ink",
          )}
        >
          {language === "en" ? translateAdminText(item.label) : item.label}
        </Link>
      ))}
    </nav>
  );
}
