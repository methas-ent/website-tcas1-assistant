import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import {
  approvePayTimeOrderFormAction,
  rejectPayTimeOrderAction,
} from "@/lib/admin-pay-time-actions";
import { requireAdmin } from "@/lib/admin";
import { getAdminCatalogErrorMessage } from "@/lib/admin-catalog";
import prisma from "@/lib/db";
import { formatPrice } from "@/lib/formatters";
import { PAY_TIME_STATUS, type PayTimeOrderStatus } from "@/lib/pay-time";

const STATUS_FILTERS: Array<{
  key: string;
  label: string;
  status: PayTimeOrderStatus | null;
}> = [
  { key: "all", label: "ทั้งหมด", status: null },
  { key: PAY_TIME_STATUS.PENDING, label: "รอตรวจสอบ", status: "PENDING" },
  { key: PAY_TIME_STATUS.APPROVED, label: "อนุมัติแล้ว", status: "APPROVED" },
  { key: PAY_TIME_STATUS.REJECTED, label: "ถูกปฏิเสธ", status: "REJECTED" },
];

const STATUS_LABEL: Record<PayTimeOrderStatus, string> = {
  PENDING: "รอตรวจสอบ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ถูกปฏิเสธ",
};

function statusVariant(status: PayTimeOrderStatus) {
  if (status === "APPROVED") {
    return "success" as const;
  }
  if (status === "REJECTED") {
    return "danger" as const;
  }
  return "warning" as const;
}

function isPayTimeStatus(value: unknown): value is PayTimeOrderStatus {
  return value === "PENDING" || value === "APPROVED" || value === "REJECTED";
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getInfoMessage(info?: string) {
  if (!info) {
    return null;
  }

  const messages: Record<string, string> = {
    approved: "อนุมัติ Pay Time แล้ว",
    "already-approved": "ออเดอร์นี้ถูกอนุมัติไปแล้ว",
    rejected: "ปฏิเสธ Pay Time แล้ว",
  };

  return messages[info] ?? null;
}

function getErrorMessage(error?: string) {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    "already-rejected": "ออเดอร์นี้ถูกปฏิเสธไปแล้ว",
    "already-approved": "ออเดอร์นี้ถูกอนุมัติไปแล้ว ไม่สามารถปฏิเสธได้",
    "approve-failed": "อนุมัติออเดอร์ Pay Time ไม่สำเร็จ",
    "reject-failed": "ปฏิเสธออเดอร์ Pay Time ไม่สำเร็จ",
  };

  return messages[error] ?? getAdminCatalogErrorMessage(error);
}

type PayTimeOrderRow = Awaited<ReturnType<typeof getPayTimeOrders>>[number];

async function getPayTimeOrders(status: PayTimeOrderStatus | null) {
  return prisma.payTimeOrder.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      lesson: {
        select: {
          id: true,
          title: true,
          course: {
            select: { id: true, title: true },
          },
        },
      },
    },
  });
}

type PayTimePageProps = {
  searchParams?: {
    status?: string;
    info?: string;
    error?: string;
  };
};

export default async function AdminPayTimeListPage({
  searchParams,
}: PayTimePageProps) {
  await requireAdmin("/admin/pay-time");

  const rawStatus = searchParams?.status?.toUpperCase();
  const selectedStatus: PayTimeOrderStatus | null = isPayTimeStatus(rawStatus)
    ? rawStatus
    : null;
  const orders = await getPayTimeOrders(selectedStatus);

  const infoMessage = getInfoMessage(searchParams?.info);
  const errorMessage = getErrorMessage(searchParams?.error);

  return (
    <AdminShell title="Pay Time">
      <div className="grid gap-6">
        {errorMessage ? (
          <p className="rounded-card bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {errorMessage}
          </p>
        ) : null}
        {infoMessage ? (
          <p className="rounded-card bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            {infoMessage}
          </p>
        ) : null}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary-700">Pay Time</p>
              <h1 className="font-heading text-2xl font-bold text-ink">
                คำขอขยายเวลาดู VDO (Pay Time)
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                ตรวจสลิปจากนักเรียนแล้วกดอนุมัติเพื่อขยายเวลาเข้าถึง VDO ของบทเรียน
                หรือกดปฏิเสธพร้อมหมายเหตุ
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => {
                const active =
                  (filter.status ?? null) === (selectedStatus ?? null);
                const href =
                  filter.status === null
                    ? "/admin/pay-time"
                    : `/admin/pay-time?status=${filter.status}`;

                return (
                  <Link
                    key={filter.key}
                    href={href}
                    className={
                      active
                        ? "rounded-full bg-primary px-4 py-2 text-sm font-bold text-white"
                        : "rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-ink-soft hover:bg-primary-50 hover:text-primary-700"
                    }
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </Card>

        <Table<PayTimeOrderRow>
          data={orders}
          getRowKey={(order) => order.id}
          emptyTitle="ยังไม่มีคำขอ Pay Time"
          emptyDescription="คำขอจากนักเรียนจะปรากฏที่นี่หลังจากที่นักเรียนชำระเงินและแนบสลิป"
          columns={[
            {
              key: "createdAt",
              header: "วันที่",
              cell: (order) => (
                <div>
                  <Link
                    className="font-bold text-primary-700 hover:text-primary-600"
                    href={`/admin/pay-time/${order.id}`}
                  >
                    {formatDateTime(order.createdAt)}
                  </Link>
                  <p className="mt-1 break-all text-xs text-ink-muted">
                    {order.id}
                  </p>
                </div>
              ),
            },
            {
              key: "user",
              header: "นักเรียน",
              cell: (order) => (
                <div>
                  <p className="font-bold text-ink">
                    {order.user.name || order.customerName}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {order.user.email || order.customerEmail}
                  </p>
                </div>
              ),
            },
            {
              key: "lesson",
              header: "คอร์ส / บทเรียน",
              cell: (order) => (
                <div>
                  <p className="font-bold text-ink">
                    {order.lesson?.title ?? order.titleSnapshot}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {order.lesson?.course?.title ?? "-"}
                  </p>
                </div>
              ),
            },
            {
              key: "hours",
              header: "ชั่วโมง",
              align: "right",
              cell: (order) => (
                <span className="font-bold text-ink">
                  {order.hoursSnapshot} ชม.
                </span>
              ),
            },
            {
              key: "amount",
              header: "จำนวนเงิน",
              align: "right",
              cell: (order) => (
                <span className="font-bold text-ink">
                  {formatPrice(order.priceCentsSnapshot, order.currency)}
                </span>
              ),
            },
            {
              key: "slip",
              header: "สลิป",
              cell: (order) => {
                if (!order.paymentSlipStorageKey) {
                  return (
                    <Badge variant="warning">ยังไม่มี</Badge>
                  );
                }

                return (
                  <Link
                    className="text-xs font-bold text-primary-700 hover:text-primary-600"
                    href={`/api/admin/pay-time/orders/${order.id}/payment-slip`}
                    target="_blank"
                  >
                    เปิดสลิป
                  </Link>
                );
              },
            },
            {
              key: "status",
              header: "สถานะ",
              cell: (order) => {
                const status = order.status as PayTimeOrderStatus;
                return (
                  <Badge variant={statusVariant(status)}>
                    {STATUS_LABEL[status] ?? status}
                  </Badge>
                );
              },
            },
            {
              key: "actions",
              header: "จัดการ",
              align: "right",
              cell: (order) => {
                const status = order.status as PayTimeOrderStatus;

                return (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      href={`/admin/pay-time/${order.id}`}
                      className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                    >
                      เปิด
                    </Link>
                    {status === "PENDING" ? (
                      <>
                        <form action={approvePayTimeOrderFormAction}>
                          <input
                            name="orderId"
                            type="hidden"
                            value={order.id}
                          />
                          <Button size="sm" type="submit" variant="success">
                            อนุมัติ
                          </Button>
                        </form>
                        <form action={rejectPayTimeOrderAction}>
                          <input
                            name="orderId"
                            type="hidden"
                            value={order.id}
                          />
                          <Button size="sm" type="submit" variant="outline">
                            ปฏิเสธ
                          </Button>
                        </form>
                      </>
                    ) : null}
                  </div>
                );
              },
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
