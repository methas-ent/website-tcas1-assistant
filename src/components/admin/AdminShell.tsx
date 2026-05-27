import type { ReactNode } from "react";
import { AdminShellNav } from "@/components/admin/AdminShellNav";
import { AdminTranslatedText } from "@/components/admin/AdminTranslatedText";
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
  { href: "/admin/videos", label: "อัปโหลด VDO" },
  { href: "/admin/pay-time", label: "Pay Time" },
];

const studioRewriteHrefs = new Set([
  "/admin/packages",
  "/admin/courses",
  "/admin/videos/upload",
]);

function normalizeNavItem(item: AdminShellNavItem): AdminShellNavItem {
  if (studioRewriteHrefs.has(item.href)) {
    return {
      ...item,
      href: "/admin/videos",
      label: "อัปโหลด VDO",
    };
  }

  // Deep Pay Time routes (e.g. /admin/pay-time/[id]) should highlight
  // the top-level Pay Time nav item.
  if (
    item.href.startsWith("/admin/pay-time/") ||
    item.href === "/admin/pay-time"
  ) {
    return {
      ...item,
      href: "/admin/pay-time",
      label: "Pay Time",
    };
  }

  return item;
}

function resolveNavItems(navItems?: AdminShellNavItem[]) {
  if (!navItems?.length) {
    return defaultNavItems;
  }

  const normalizedNavItems = navItems.map(normalizeNavItem);
  const overrides = new Map(normalizedNavItems.map((item) => [item.href, item]));
  const mergedItems = defaultNavItems.map((item) => ({
    ...item,
    ...overrides.get(item.href),
  }));
  const extraItems = normalizedNavItems.filter(
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
    <div
      className={cn(
        "min-h-screen bg-surface-soft transition-colors duration-300",
        className,
      )}
      data-admin-language="th"
      data-admin-shell
      data-admin-theme="light"
    >
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        <AdminTranslatedText text="ข้ามไปยังเนื้อหา" />
      </a>
      <div className="grid min-h-screen lg:grid-cols-[288px_minmax(0,1fr)]">
        <aside className="sticky top-0 z-30 border-b border-line bg-surface/95 shadow-sm backdrop-blur transition-colors duration-300 lg:h-screen lg:border-b-0 lg:border-r lg:shadow-none lg:backdrop-blur-none">
          <div className="flex items-center gap-3 px-page py-4 lg:px-5 lg:py-5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary font-heading text-sm font-black text-white shadow-card">
              K
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-bold text-ink">
                VDO Knowledge Academy
              </p>
              <p className="text-xs text-ink-muted">
                <AdminTranslatedText text="ผู้ดูแลระบบ" />
              </p>
            </div>
          </div>
          <AdminShellNav items={resolvedNavItems} />
        </aside>
        <div className="min-w-0">
          <header className="border-b border-line bg-surface/95 backdrop-blur transition-colors duration-300 lg:sticky lg:top-0 lg:z-20">
            <div className="flex flex-wrap items-center justify-between gap-4 px-page py-4 lg:pr-44">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
                  Admin
                </p>
                <h1 className="font-heading text-xl font-bold text-ink">
                  <AdminTranslatedText text={title} />
                </h1>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {actions ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {actions}
                  </div>
                ) : null}
              </div>
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
