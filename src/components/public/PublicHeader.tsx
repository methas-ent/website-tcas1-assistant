import Link from "next/link";
import type { ReactNode } from "react";
import { PublicHeaderNav } from "@/components/public/PublicHeaderNav";
import type { PublicNavItem } from "@/components/public/PublicHeaderNav";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { logoutAction } from "@/lib/auth-actions";
import { getCurrentUser, isAdmin, isStudent } from "@/lib/auth";

export type PublicHeaderProps = {
  navItems?: PublicNavItem[];
  actions?: ReactNode;
  cartCount?: number;
  className?: string;
};

const defaultNavItems: PublicNavItem[] = [
  { href: "/", label: "หน้าแรก" },
  { href: "/courses", label: "คอร์ส/แพ็กเกจ" },
  { href: "/student/my-courses", label: "เข้าเรียน" },
  { href: "/cart", label: "ตะกร้า" },
];

export async function PublicHeader({
  navItems = defaultNavItems,
  actions,
  cartCount,
  className,
}: PublicHeaderProps) {
  const user = await getCurrentUser();
  const studentNavItem = isStudent(user)
    ? { href: "/student/my-courses", label: "คอร์สของฉัน" }
    : null;
  const adminNavItem = isAdmin(user) ? { href: "/admin", label: "แอดมิน" } : null;
  const sessionNavItem = studentNavItem ?? adminNavItem;
  const resolvedNavItems =
    sessionNavItem && !navItems.some((item) => item.href === sessionNavItem.href)
      ? [...navItems, sessionNavItem]
      : navItems;

  const accountActions = isStudent(user) ? (
    <>
      <span className="hidden max-w-36 truncate text-xs font-bold text-ink-muted lg:inline">
        {user?.name}
      </span>
      <ButtonLink href="/student/my-courses" size="sm">
        เข้าเรียน
      </ButtonLink>
      <form action={logoutAction}>
        <Button size="sm" type="submit" variant="outline">
          ออกจากระบบ
        </Button>
      </form>
    </>
  ) : isAdmin(user) ? (
    <>
      <ButtonLink href="/admin" size="sm">
        แดชบอร์ด
      </ButtonLink>
      <form action={logoutAction}>
        <Button size="sm" type="submit" variant="outline">
          ออกจากระบบ
        </Button>
      </form>
    </>
  ) : (
    <>
      <ButtonLink href="/login" size="sm" variant="outline">
        เข้าสู่ระบบ
      </ButtonLink>
      <ButtonLink href="/register" size="sm">
        สมัครเรียน
      </ButtonLink>
    </>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-page py-3 md:flex-nowrap md:gap-4 lg:pr-44">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 md:flex-none"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary font-heading text-sm font-black text-white shadow-card">
            VDO
          </span>
          <span className="hidden min-w-0 min-[430px]:block md:block">
            <span className="block truncate font-heading text-sm font-bold text-ink sm:text-base">
              VDO Knowledge Academy
            </span>
            <span className="hidden text-xs text-ink-muted sm:block">
              ระบบเรียนออนไลน์
            </span>
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          {typeof cartCount === "number" ? (
            <ButtonLink href="/cart" variant="outline" size="sm">
              ตะกร้า
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                {cartCount}
              </span>
            </ButtonLink>
          ) : null}
          {accountActions}
          {actions}
        </div>
        <PublicHeaderNav
          navItems={resolvedNavItems}
          className="order-3 flex w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface-soft p-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] md:order-none md:w-auto md:overflow-visible md:border-0 md:bg-transparent md:p-0 [&::-webkit-scrollbar]:hidden"
        />
      </div>
    </header>
  );
}
