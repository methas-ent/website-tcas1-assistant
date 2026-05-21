import { AdminShell } from "@/components/admin/AdminShell";
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
    { label: "คำสั่งซื้อทั้งหมด", value: stats.totalOrders },
    { label: "ชำระแล้ว", value: stats.paidOrders },
    { label: "รอดำเนินการ", value: stats.pendingOrders },
    { label: "นักเรียน", value: stats.totalStudents },
    { label: "คอร์สทั้งหมด", value: stats.totalCourses },
    { label: "แพ็กเกจทั้งหมด", value: stats.totalPackages },
    { label: "แพ็กเกจที่ขายแล้ว", value: stats.purchasedPackages },
    { label: "คอร์สที่เปิดสิทธิ์", value: stats.purchasedCourses },
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
            ออกจากระบบ {admin.name}
          </button>
        </form>
      }
    >
      <div className="grid gap-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <p className="text-sm font-bold text-ink-muted">{card.label}</p>
              <p className="mt-2 font-heading text-3xl font-bold text-ink">
                {card.value.toLocaleString("th-TH")}
              </p>
            </Card>
          ))}
        </section>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-primary-700">
                Recent Orders
              </p>
              <h2 className="font-heading text-2xl font-bold text-ink">
                คำสั่งซื้อล่าสุด
              </h2>
            </div>
            <ButtonLink href="/admin/orders" size="sm">
              ดูคำสั่งซื้อทั้งหมด
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
                ยังไม่มีคำสั่งซื้อ
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
