import Link from "next/link";

export function AppTopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-page py-3 lg:pr-44">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-sm font-black text-white shadow-card">
            V
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-heading text-sm font-bold text-primary-800">
              VDO Knowledge Academy
            </span>
            <span className="hidden text-xs text-ink-muted sm:block">
              ระบบเรียนออนไลน์
            </span>
          </span>
        </Link>
        <nav className="ml-auto flex shrink-0 items-center gap-2 text-sm font-semibold">
          <Link
            href="/student/my-courses"
            className="rounded-full px-3 py-2 text-primary-700 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 sm:px-4"
          >
            คอร์สของฉัน
          </Link>
          <Link
            href="/student/my-courses"
            className="rounded-full bg-primary px-3 py-2 text-white shadow-sm transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 sm:px-4"
          >
            เข้าเรียน
          </Link>
        </nav>
      </div>
    </header>
  );
}
