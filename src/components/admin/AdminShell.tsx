import type { ReactNode } from "react";
import { AdminShellNav } from "@/components/admin/AdminShellNav";
import { cn } from "@/components/ui/cn";

export type AdminShellNavItem = {
  href: string;
  label: string;
  active?: boolean;
  badge?: string;
};

export type AdminShellProps = {
  children: ReactNode;
  navItems?: AdminShellNavItem[];
  title?: string;
  actions?: ReactNode;
  className?: string;
};

const defaultNavItems: AdminShellNavItem[] = [
  { href: "/admin", label: "แดชบอร์ด" },
  { href: "/admin/orders", label: "ออเดอร์" },
  { href: "/admin/courses", label: "คอร์ส" },
  { href: "/admin/packages", label: "แพ็กเกจ" },
  { href: "/admin/videos", label: "วิดีโอ" },
];

function resolveNavItems(navItems?: AdminShellNavItem[]) {
  if (!navItems?.length) {
    return defaultNavItems;
  }

  const overrides = new Map(navItems.map((item) => [item.href, item]));
  const mergedItems = defaultNavItems.map((item) => ({
    ...item,
    ...overrides.get(item.href),
  }));
  const extraItems = navItems.filter(
    (item) =>
      !defaultNavItems.some((defaultItem) => defaultItem.href === item.href),
  );

  return [...mergedItems, ...extraItems];
}

export function AdminShell({
  children,
  navItems,
  title = "ผู้ดูแลระบบ",
  actions,
  className,
}: AdminShellProps) {
  const resolvedNavItems = resolveNavItems(navItems);

  return (
    <div className={cn("min-h-screen bg-surface-soft", className)}>
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        ข้ามไปยังเนื้อหา
      </a>
      <div className="grid min-h-screen lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="z-30 border-b border-line bg-surface/95 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:backdrop-blur-none">
          <div className="flex items-center gap-3 px-page py-4 lg:px-5 lg:py-5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary font-heading text-sm font-black text-white shadow-card">
              V
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-bold text-ink">
                VDO Knowledge Academy
              </p>
              <p className="text-xs text-ink-muted">Admin</p>
            </div>
          </div>
          <AdminShellNav items={resolvedNavItems} />
        </aside>
        <div className="min-w-0">
          <header className="border-b border-line bg-surface/95 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4 px-page py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
                  Admin
                </p>
                <h1 className="font-heading text-xl font-bold text-ink">
                  {title}
                </h1>
              </div>
              {actions ? (
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
              ) : null}
            </div>
          </header>
          <main
            id="admin-main"
            className="px-page py-6 transition-all duration-200 ease-out motion-reduce:transition-none"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
