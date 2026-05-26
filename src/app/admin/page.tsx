import { AdminShell } from "@/components/admin/AdminShell";
import { AdminTranslatedText } from "@/components/admin/AdminTranslatedText";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { logoutAction } from "@/lib/auth-actions";
import { formatPrice } from "@/lib/storefront";
import { getAdminDashboard, requireAdmin } from "@/lib/admin";
import prisma from "@/lib/db";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin("/admin");
  const stats = await getAdminDashboard();
  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      totalCents: true,
      currency: true,
      customerName: true,
      createdAt: true,
    },
  });

  const cards = [
    {
      label: "คำสั่งซื้อทั้งหมด",
      value: stats.totalOrders,
      hint: "รวมทุกสถานะ",
      className:
        "admin-metric-card border-l-4 border-l-sky-500 shadow-[0_18px_40px_rgba(14,165,233,0.14)]",
      accentClassName: "admin-metric-dot bg-sky-500",
      valueClassName: "admin-metric-value text-sky-700",
    },
    {
      label: "ชำระแล้ว",
      value: stats.paidOrders,
      hint: "เปิดสิทธิ์แล้ว",
      className:
        "admin-metric-card border-l-4 border-l-emerald-500 shadow-[0_18px_40px_rgba(16,185,129,0.14)]",
      accentClassName: "admin-metric-dot bg-emerald-500",
      valueClassName: "admin-metric-value text-emerald-700",
    },
    {
      label: "รอตรวจสลิป",
      value: stats.pendingSlipReviews,
      hint: "มีหลักฐานโอน",
      className:
        "admin-metric-card border-l-4 border-l-amber-500 shadow-[0_18px_40px_rgba(245,158,11,0.16)]",
      accentClassName: "admin-metric-dot bg-amber-500",
      valueClassName: "admin-metric-value text-amber-700",
    },
    {
      label: "รอดำเนินการ",
      value: stats.pendingOrders,
      hint: "ยังไม่ชำระ/รอตรวจ",
      className:
        "admin-metric-card border-l-4 border-l-orange-500 shadow-[0_18px_40px_rgba(249,115,22,0.13)]",
      accentClassName: "admin-metric-dot bg-orange-500",
      valueClassName: "admin-metric-value text-orange-700",
    },
    {
      label: "นักเรียน",
      value: stats.totalStudents,
      hint: "บัญชี STUDENT",
      className:
        "admin-metric-card border-l-4 border-l-cyan-500 shadow-[0_18px_40px_rgba(6,182,212,0.14)]",
      accentClassName: "admin-metric-dot bg-cyan-500",
      valueClassName: "admin-metric-value text-cyan-700",
    },
    {
      label: "คอร์สทั้งหมด",
      value: stats.totalCourses,
      hint: "รวม Draft/Ready",
      className:
        "admin-metric-card border-l-4 border-l-indigo-500 shadow-[0_18px_40px_rgba(99,102,241,0.13)]",
      accentClassName: "admin-metric-dot bg-indigo-500",
      valueClassName: "admin-metric-value text-indigo-700",
    },
    {
      label: "แพ็กเกจทั้งหมด",
      value: stats.totalPackages,
      hint: "ชุดขายทั้งหมด",
      className:
        "admin-metric-card border-l-4 border-l-rose-500 shadow-[0_18px_40px_rgba(244,63,94,0.12)]",
      accentClassName: "admin-metric-dot bg-rose-500",
      valueClassName: "admin-metric-value text-rose-700",
    },
    {
      label: "แพ็กเกจที่ขายแล้ว",
      value: stats.purchasedPackages,
      hint: "จากออเดอร์ PAID",
      className:
        "admin-metric-card border-l-4 border-l-lime-500 shadow-[0_18px_40px_rgba(132,204,22,0.14)]",
      accentClassName: "admin-metric-dot bg-lime-500",
      valueClassName: "admin-metric-value text-lime-700",
    },
    {
      label: "คอร์สที่เปิดสิทธิ์",
      value: stats.purchasedCourses,
      hint: "คอร์สที่มี enrollment",
      className:
        "admin-metric-card border-l-4 border-l-teal-500 shadow-[0_18px_40px_rgba(20,184,166,0.14)]",
      accentClassName: "admin-metric-dot bg-teal-500",
      valueClassName: "admin-metric-value text-teal-700",
    },
  ];

  return (
    <AdminShell
      title="แดชบอร์ด"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด", active: true },
        { href: "/admin/orders", label: "ออเดอร์" },
        { href: "/admin/courses", label: "คอร์ส" },
        { href: "/admin/packages", label: "แพ็กเกจ" },
        { href: "/admin/videos", label: "วิดีโอ" },
      ]}
      actions={
        <form action={logoutAction}>
          <button className="text-sm font-bold text-ink-muted" type="submit">
            <AdminTranslatedText text="ออกจากระบบ" /> {admin.name}
          </button>
        </form>
      }
    >
      <div className="grid gap-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {cards.map((card) => (
            <Card
              className={card.className}
              interactive
              key={card.label}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink-muted">
                    <AdminTranslatedText text={card.label} />
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink-faint">
                    <AdminTranslatedText text={card.hint} />
                  </p>
                </div>
                <span
                  className={`mt-1 h-3 w-3 rounded-full ${card.accentClassName}`}
                />
              </div>
              <p
                className={`mt-4 font-heading text-3xl font-bold ${card.valueClassName}`}
              >
                {card.value.toLocaleString("th-TH")}
              </p>
            </Card>
          ))}
        </section>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-primary-700">
                <AdminTranslatedText text="รายการล่าสุด" />
              </p>
              <h2 className="font-heading text-2xl font-bold text-ink">
                <AdminTranslatedText text="คำสั่งซื้อล่าสุด" />
              </h2>
            </div>
            <ButtonLink href="/admin/orders" size="sm">
              <AdminTranslatedText text="ดูคำสั่งซื้อทั้งหมด" />
            </ButtonLink>
          </div>
          <div className="mt-5 grid gap-3">
            {recentOrders.map((order) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface-soft p-4"
                key={order.id}
              >
                <div>
                  <p className="font-bold text-ink">{order.customerName}</p>
                  <p className="text-xs text-ink-muted">
                    {order.id} · {order.status}
                  </p>
                </div>
                <p className="font-heading text-lg font-bold text-primary-700">
                  {formatPrice(order.totalCents, order.currency)}
                </p>
              </div>
            ))}
            {!recentOrders.length ? (
              <p className="rounded-card border border-dashed border-line p-6 text-center text-sm text-ink-muted">
                <AdminTranslatedText text="ยังไม่มีคำสั่งซื้อ" />
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
