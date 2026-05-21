import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { Button } from "@/components/ui/Button";
import { logoutAction } from "@/lib/auth-actions";

export type StudentShellNavItem = {
  href: string;
  label: string;
  active?: boolean;
};

export type StudentShellProps = {
  children: ReactNode;
  navItems?: StudentShellNavItem[];
  title?: string;
  actions?: ReactNode;
  className?: string;
};

const defaultNavItems: StudentShellNavItem[] = [
  { href: "/student/my-courses", label: "คอร์สของฉัน" },
  { href: "/courses", label: "เลือกคอร์ส" },
  { href: "/cart", label: "ตะกร้า" },
];

export function StudentShell({
  children,
  navItems = defaultNavItems,
  title = "พื้นที่นักเรียน",
  actions,
  className,
}: StudentShellProps) {
  return (
    <div className={cn("min-h-screen bg-surface-soft", className)}>
      <a
        href="#student-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        ข้ามไปยังเนื้อหา
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-page py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
              Student
            </p>
            <h1 className="font-heading text-xl font-bold text-ink">{title}</h1>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {actions}
            <form action={logoutAction}>
              <Button size="sm" type="submit" variant="outline">
                ออกจากระบบ
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-5 px-page py-5 sm:py-6 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav
            className="flex gap-2 overflow-x-auto rounded-2xl border border-line bg-surface p-2 shadow-sm scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] lg:grid lg:overflow-visible [&::-webkit-scrollbar]:hidden"
            aria-label="เมนูนักเรียน"
          >
            {navItems.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300",
                  item.active
                    ? "bg-primary text-white shadow-sm"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main id="student-main" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
