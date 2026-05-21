import Link from "next/link";

export function AppTopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-sm font-black text-white shadow-card">
            V
          </span>
          <span className="leading-tight">
            <span className="block font-heading text-sm font-bold text-primary-800">
              VDO Knowledge Academy
            </span>
            <span className="hidden text-xs text-ink-muted sm:block">
              ระบบเรียนออนไลน์
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link
            href="/student/my-courses"
            className="rounded-full px-4 py-2 text-primary-700 transition hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            คอร์สของฉัน
          </Link>
          <Link
            href="/student/my-courses"
            className="rounded-full bg-primary px-4 py-2 text-white shadow-sm transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            เข้าเรียน
          </Link>
        </nav>
      </div>
    </header>
  );
}
