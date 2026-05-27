import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import {
  approvePayTimeOrderFormAction,
  rejectPayTimeOrderAction,
} from "@/lib/admin-pay-time-actions";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/db";
import { formatPrice } from "@/lib/formatters";
import {
  PAY_TIME_EXTENSION_STATUS,
  type PayTimeExtensionStatus,
  type PayTimeOrderStatus,
} from "@/lib/pay-time";

const STATUS_LABEL: Record<PayTimeOrderStatus, string> = {
  PENDING: "รอตรวจสอบ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ถูกปฏิเสธ",
};

const EXTENSION_STATUS_LABEL: Record<PayTimeExtensionStatus, string> = {
  ACTIVE: "ใช้งานอยู่",
  EXPIRED: "หมดอายุ",
  REVOKED: "ยกเลิกสิทธิ์",
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

function extensionVariant(status: PayTimeExtensionStatus) {
  if (status === PAY_TIME_EXTENSION_STATUS.ACTIVE) {
    return "success" as const;
  }
  if (status === PAY_TIME_EXTENSION_STATUS.REVOKED) {
    return "danger" as const;
  }
  return "neutral" as const;
}

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatFileSize(value: number | null | undefined) {
  if (!value || value <= 0) {
    return "-";
  }

  const units = ["B", "KB", "MB"];
  const exponent = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const amount = value / 1024 ** exponent;

  return `${amount.toFixed(amount >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
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
    "not-found": "ไม่พบออเดอร์ Pay Time นี้",
  };

  return messages[error] ?? null;
}

type PayTimeDetailPageProps = {
  params: { id: string };
  searchParams?: {
    info?: string;
    error?: string;
  };
};

export default async function AdminPayTimeDetailPage({
  params,
  searchParams,
}: PayTimeDetailPageProps) {
  await requireAdmin(`/admin/pay-time/${params.id}`);

  const order = await prisma.payTimeOrder.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true },
      },
      rejectedBy: {
        select: { id: true, name: true, email: true },
      },
      lesson: {
        select: {
          id: true,
          title: true,
          payTimeEnabled: true,
          payTimePriceCents: true,
          payTimeHours: true,
          payTimeDescription: true,
          course: {
            select: { id: true, title: true },
          },
        },
      },
      extension: true,
    },
  });

  if (!order) {
    notFound();
  }

  const status = order.status as PayTimeOrderStatus;
  const isPending = status === "PENDING";
  const slipUrl = `/api/admin/pay-time/orders/${order.id}/payment-slip`;
  const slipIsImage =
    order.paymentSlipMimeType?.startsWith("image/") ?? false;

  const priceDrift =
    order.lesson &&
    order.lesson.payTimePriceCents !== order.priceCentsSnapshot;
  const hoursDrift =
    order.lesson && order.lesson.payTimeHours !== order.hoursSnapshot;

  const infoMessage = getInfoMessage(searchParams?.info);
  const errorMessage = getErrorMessage(searchParams?.error);

  return (
    <AdminShell
      title="รายละเอียด Pay Time"
      actions={
        <Link
          className="text-sm font-bold text-primary-700"
          href="/admin/pay-time"
        >
          กลับรายการ Pay Time
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="grid gap-6">
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
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-primary-700">Pay Time Order</p>
                <h1 className="font-heading text-2xl font-bold text-ink">
                  {order.titleSnapshot}
                </h1>
                <p className="mt-2 break-all text-sm text-ink-muted">
                  {order.id}
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  สร้างเมื่อ {formatDate(order.createdAt)}
                </p>
              </div>
              <Badge variant={statusVariant(status)} size="md">
                {STATUS_LABEL[status]}
              </Badge>
            </div>
          </Card>

          <Card>
            <h2 className="font-heading text-xl font-bold text-ink">
              คอร์ส / บทเรียน
            </h2>
            <dl className="mt-5 grid gap-3 text-sm">
              <div>
                <dt className="font-bold text-ink">คอร์ส</dt>
                <dd className="mt-1 text-ink-muted">
                  {order.lesson?.course?.title ?? "ไม่พบคอร์ส"}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-ink">บทเรียน</dt>
                <dd className="mt-1 text-ink-muted">
                  {order.lesson?.title ?? order.titleSnapshot}
                </dd>
              </div>
              {order.lesson?.course?.id ? (
                <div>
                  <Link
                    className="text-sm font-bold text-primary-700 hover:text-primary-600"
                    href={`/admin/courses/${order.lesson.course.id}/edit`}
                  >
                    เปิดหน้าจัดการคอร์ส
                  </Link>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card>
            <h2 className="font-heading text-xl font-bold text-ink">
              ราคา / ระยะเวลา
            </h2>
            {priceDrift || hoursDrift ? (
              <p className="mt-3 rounded-card bg-warning-soft px-4 py-3 text-sm font-semibold text-warning">
                ค่าปัจจุบันของบทเรียนเปลี่ยนไปจาก snapshot ตอนสร้างคำขอ — ระบบจะใช้ snapshot ตอนอนุมัติ
              </p>
            ) : null}
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
                  Snapshot
                </p>
                <p className="mt-2 font-heading text-xl font-bold text-ink">
                  {formatPrice(order.priceCentsSnapshot, order.currency)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {order.hoursSnapshot} ชั่วโมง
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-surface px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
                  ค่าปัจจุบันของบทเรียน
                </p>
                <p className="mt-2 font-heading text-xl font-bold text-ink">
                  {order.lesson
                    ? formatPrice(order.lesson.payTimePriceCents, order.currency)
                    : "-"}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {order.lesson ? `${order.lesson.payTimeHours} ชั่วโมง` : "-"}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-heading text-xl font-bold text-ink">
              ไทม์ไลน์สถานะ
            </h2>
            <ul className="mt-5 grid gap-3 text-sm">
              <li className="flex items-start justify-between gap-3 rounded-card border border-line bg-surface-soft p-3">
                <div>
                  <p className="font-bold text-ink">สร้างคำขอ</p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <Badge variant="primary">เริ่มต้น</Badge>
              </li>
              {order.paymentSlipUploadedAt ? (
                <li className="flex items-start justify-between gap-3 rounded-card border border-line bg-surface-soft p-3">
                  <div>
                    <p className="font-bold text-ink">อัปโหลดสลิป</p>
                    <p className="text-xs text-ink-muted">
                      {formatDate(order.paymentSlipUploadedAt)}
                    </p>
                  </div>
                  <Badge variant="neutral">สลิป</Badge>
                </li>
              ) : null}
              {order.approvedAt ? (
                <li className="flex items-start justify-between gap-3 rounded-card border border-line bg-surface-soft p-3">
                  <div>
                    <p className="font-bold text-ink">อนุมัติ</p>
                    <p className="text-xs text-ink-muted">
                      {formatDate(order.approvedAt)}{" "}
                      {order.approvedBy
                        ? `· โดย ${order.approvedBy.name || order.approvedBy.email}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant="success">อนุมัติแล้ว</Badge>
                </li>
              ) : null}
              {order.rejectedAt ? (
                <li className="flex items-start justify-between gap-3 rounded-card border border-line bg-surface-soft p-3">
                  <div>
                    <p className="font-bold text-ink">ปฏิเสธ</p>
                    <p className="text-xs text-ink-muted">
                      {formatDate(order.rejectedAt)}{" "}
                      {order.rejectedBy
                        ? `· โดย ${order.rejectedBy.name || order.rejectedBy.email}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant="danger">ถูกปฏิเสธ</Badge>
                </li>
              ) : null}
              {order.appliedAt ? (
                <li className="flex items-start justify-between gap-3 rounded-card border border-line bg-surface-soft p-3">
                  <div>
                    <p className="font-bold text-ink">เปิดสิทธิ์ดู VDO</p>
                    <p className="text-xs text-ink-muted">
                      {formatDate(order.appliedAt)}
                    </p>
                  </div>
                  <Badge variant="success">ปรับใช้แล้ว</Badge>
                </li>
              ) : null}
            </ul>
            {order.note ? (
              <div className="mt-5 rounded-card border border-dashed border-line bg-surface-soft p-3 text-sm">
                <p className="font-bold text-ink">หมายเหตุ</p>
                <p className="mt-1 whitespace-pre-wrap text-ink-muted">
                  {order.note}
                </p>
              </div>
            ) : null}
          </Card>

          {order.extension ? (
            <Card>
              <h2 className="font-heading text-xl font-bold text-ink">
                สิทธิ์เข้าถึง VDO ที่เปิดให้
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                ระบบสร้าง VideoAccessExtension ให้นักเรียนเรียบร้อยแล้ว
              </p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-bold text-ink">ชั่วโมงที่ได้รับ</dt>
                  <dd className="mt-1 text-ink-muted">
                    {order.extension.hoursGranted} ชั่วโมง
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-ink">สถานะ</dt>
                  <dd className="mt-1">
                    <Badge
                      variant={extensionVariant(
                        order.extension.status as PayTimeExtensionStatus,
                      )}
                    >
                      {EXTENSION_STATUS_LABEL[
                        order.extension.status as PayTimeExtensionStatus
                      ] ?? order.extension.status}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-ink">เริ่มต้น</dt>
                  <dd className="mt-1 text-ink-muted">
                    {formatDate(order.extension.startsAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-ink">หมดอายุ</dt>
                  <dd className="mt-1 text-ink-muted">
                    {formatDate(order.extension.expiresAt)}
                  </dd>
                </div>
              </dl>
            </Card>
          ) : null}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <h2 className="font-heading text-xl font-bold text-ink">
              ข้อมูลนักเรียน
            </h2>
            <dl className="mt-5 grid gap-3 text-sm">
              <div>
                <dt className="font-bold text-ink">ชื่อ</dt>
                <dd className="mt-1 text-ink-muted">
                  {order.user?.name || order.customerName}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-ink">อีเมล</dt>
                <dd className="mt-1 text-ink-muted">
                  {order.user?.email || order.customerEmail}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-ink">โทรศัพท์</dt>
                <dd className="mt-1 text-ink-muted">
                  {order.customerPhone ?? "-"}
                </dd>
              </div>
            </dl>

            {isPending ? (
              <div className="mt-6 grid gap-3 border-t border-line pt-5">
                <form action={approvePayTimeOrderFormAction}>
                  <input name="orderId" type="hidden" value={order.id} />
                  <Button fullWidth type="submit" variant="success">
                    อนุมัติ Pay Time
                  </Button>
                </form>
                <form action={rejectPayTimeOrderAction} className="grid gap-3">
                  <input name="orderId" type="hidden" value={order.id} />
                  <Textarea
                    label="เพิ่มหมายเหตุการปฏิเสธ"
                    name="reason"
                    placeholder="เช่น สลิปไม่ตรงกับยอด หรือยอดไม่ครบ"
                    rows={3}
                  />
                  <Button fullWidth type="submit" variant="outline">
                    ปฏิเสธ
                  </Button>
                </form>
              </div>
            ) : (
              <p className="mt-6 rounded-card bg-surface-muted px-4 py-3 text-xs text-ink-muted">
                คำขอนี้ถูกตรวจสอบแล้ว ไม่สามารถเปลี่ยนสถานะได้
              </p>
            )}
          </Card>

          <Card className="mt-6">
            <h2 className="font-heading text-xl font-bold text-ink">
              สลิปโอนเงิน
            </h2>
            {order.paymentSlipStorageKey ? (
              <div className="mt-5 grid gap-4">
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="font-bold text-ink">ชื่อไฟล์</dt>
                    <dd className="mt-1 break-all text-ink-muted">
                      {order.paymentSlipOriginalFileName ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-ink">ขนาดไฟล์</dt>
                    <dd className="mt-1 text-ink-muted">
                      {formatFileSize(order.paymentSlipSizeBytes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-ink">อัปโหลดเมื่อ</dt>
                    <dd className="mt-1 text-ink-muted">
                      {formatDate(order.paymentSlipUploadedAt)}
                    </dd>
                  </div>
                </dl>
                {slipIsImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={`สลิป Pay Time ของออเดอร์ ${order.id}`}
                    className="max-h-[420px] w-full rounded-card border border-line object-contain"
                    src={slipUrl}
                  />
                ) : (
                  <iframe
                    className="h-[420px] w-full rounded-card border border-line bg-surface"
                    src={slipUrl}
                    title={`สลิป Pay Time ของออเดอร์ ${order.id}`}
                  />
                )}
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                  href={slipUrl}
                  target="_blank"
                >
                  เปิดสลิปเต็มหน้า
                </Link>
              </div>
            ) : (
              <p className="mt-3 rounded-card border border-dashed border-line p-4 text-sm text-ink-muted">
                ยังไม่มีสลิปแนบมากับคำขอนี้
              </p>
            )}
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}
