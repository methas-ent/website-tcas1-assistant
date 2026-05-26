import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { cancelOrderAction, markOrderPaidAction } from "@/lib/admin-actions";
import {
  adminOrderStatuses,
  getAdminOrders,
  getStatusLabel,
  requireAdmin,
} from "@/lib/admin";
import { formatPrice } from "@/lib/storefront";

type OrdersPageProps = {
  searchParams?: {
    status?: string;
  };
};

type AdminOrder = Awaited<ReturnType<typeof getAdminOrders>>[number];

function statusVariant(status: string) {
  if (status === "PAID") {
    return "success" as const;
  }

  if (status === "CANCELLED") {
    return "danger" as const;
  }

  return "warning" as const;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminOrdersPage({
  searchParams,
}: OrdersPageProps) {
  await requireAdmin("/admin/orders");

  const selectedStatus = searchParams?.status;
  const orders = await getAdminOrders(selectedStatus);
  const filterItems = [
    { href: "/admin/orders", label: "ทั้งหมด", active: !selectedStatus },
    ...adminOrderStatuses.map((status) => ({
      href: `/admin/orders?status=${status}`,
      label: getStatusLabel(status),
      active: selectedStatus === status,
    })),
  ];

  return (
    <AdminShell
      title="คำสั่งซื้อ"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์", active: true },
      ]}
    >
      <div className="grid gap-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary-700">Orders</p>
              <h1 className="font-heading text-2xl font-bold text-ink">
                รายการคำสั่งซื้อ
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                ตรวจสอบคำสั่งซื้อ และยืนยันการชำระเงินแบบ manual
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterItems.map((item) => (
                <Link
                  className={
                    item.active
                      ? "rounded-full bg-primary px-4 py-2 text-sm font-bold text-white"
                      : "rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-ink-soft hover:bg-primary-50 hover:text-primary-700"
                  }
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </Card>

        <Table<AdminOrder>
          data={orders}
          emptyTitle="ยังไม่มีคำสั่งซื้อ"
          emptyDescription="คำสั่งซื้อจาก checkout จะปรากฏที่นี่"
          getRowKey={(order) => order.id}
          columns={[
            {
              key: "order",
              header: "คำสั่งซื้อ",
              cell: (order) => (
                <div>
                  <Link
                    className="font-bold text-primary-700 hover:text-primary-600"
                    href={`/admin/orders/${order.id}`}
                  >
                    {order.id}
                  </Link>
                  <p className="mt-1 text-xs text-ink-muted">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
              ),
            },
            {
              key: "customer",
              header: "ลูกค้า",
              cell: (order) => (
                <div>
                  <p className="font-bold text-ink">{order.customerName}</p>
                  <p className="text-xs text-ink-muted">{order.customerEmail}</p>
                </div>
              ),
            },
            {
              key: "items",
              header: "แพ็กเกจ",
              cell: (order) => (
                <div className="grid gap-1">
                  {order.items.map((item) => (
                    <span key={item.id}>{item.titleSnapshot}</span>
                  ))}
                </div>
              ),
            },
            {
              key: "status",
              header: "สถานะ",
              cell: (order) => (
                <Badge variant={statusVariant(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              ),
            },
            {
              key: "payment-slip",
              header: "สลิป",
              cell: (order) => (
                <div className="grid gap-1">
                  <Badge
                    variant={order.paymentSlipUploadedAt ? "success" : "warning"}
                  >
                    {order.paymentSlipUploadedAt ? "มีสลิป" : "ยังไม่มี"}
                  </Badge>
                  {order.paymentSlipUploadedAt ? (
                    <Link
                      className="text-xs font-bold text-primary-700 hover:text-primary-600"
                      href={`/admin/orders/${order.id}`}
                    >
                      ตรวจสอบ
                    </Link>
                  ) : null}
                </div>
              ),
            },
            {
              key: "total",
              header: "ยอดรวม",
              align: "right",
              cell: (order) => (
                <span className="font-bold text-ink">
                  {formatPrice(order.totalCents, order.currency)}
                </span>
              ),
            },
            {
              key: "actions",
              header: "จัดการ",
              align: "right",
              cell: (order) => (
                <div className="flex flex-wrap justify-end gap-2">
                  {order.status !== "PAID" && order.status !== "CANCELLED" ? (
                    <form action={markOrderPaidAction}>
                      <input name="orderId" type="hidden" value={order.id} />
                      <Button size="sm" type="submit">
                        ยืนยันชำระ
                      </Button>
                    </form>
                  ) : null}
                  {order.status !== "PAID" && order.status !== "CANCELLED" ? (
                    <form action={cancelOrderAction}>
                      <input name="orderId" type="hidden" value={order.id} />
                      <Button size="sm" type="submit" variant="outline">
                        Cancel
                      </Button>
                    </form>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
