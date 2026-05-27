import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cancelOrderAction, markOrderPaidAction } from "@/lib/admin-actions";
import {
  getAdminOrderDetail,
  getStatusLabel,
  requireAdmin,
} from "@/lib/admin";
import { formatPrice } from "@/lib/storefront";

type OrderDetailPageProps = {
  params: {
    id: string;
  };
};

function statusVariant(status: string) {
  if (status === "PAID") {
    return "success" as const;
  }

  if (status === "CANCELLED") {
    return "danger" as const;
  }

  return "warning" as const;
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

function formatFileSize(value: number | null) {
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

export default async function AdminOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  await requireAdmin(`/admin/orders/${params.id}`);

  const order = await getAdminOrderDetail(params.id);

  if (!order) {
    notFound();
  }

  const enrollmentCourseIds = new Set(
    order.enrollments.map((enrollment) => enrollment.courseId),
  );
  const canMutate = order.status !== "PAID" && order.status !== "CANCELLED";
  const paymentSlipUrl = `/api/admin/orders/${order.id}/payment-slip`;
  const paymentSlipIsImage =
    order.paymentSlipMimeType?.startsWith("image/") ?? false;

  return (
    <AdminShell
      title="รายละเอียดคำสั่งซื้อ"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์", active: true },
        { href: "/admin/courses", label: "คอร์ส" },
        { href: "/admin/packages", label: "แพ็กเกจ" },
      ]}
      actions={
        <Link
          className="text-sm font-bold text-primary-700"
          href="/admin/orders"
        >
          กลับรายการออเดอร์
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="grid gap-6">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-primary-700">Order</p>
                <h1 className="font-heading text-2xl font-bold text-ink">
                  {order.id}
                </h1>
                <p className="mt-2 text-sm text-ink-muted">
                  สร้างเมื่อ {formatDate(order.createdAt)}
                </p>
              </div>
              <Badge variant={statusVariant(order.status)} size="md">
                {getStatusLabel(order.status)}
              </Badge>
            </div>
          </Card>

          <Card>
            <h2 className="font-heading text-xl font-bold text-ink">
              รายการแพ็กเกจ
            </h2>
            <div className="mt-5 grid gap-4">
              {order.items.map((item) => (
                <div
                  className="rounded-card border border-line bg-surface-soft p-4"
                  key={item.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-ink">
                        {item.titleSnapshot}
                      </h3>
                      <p className="mt-1 text-sm text-ink-muted">
                        {formatPrice(item.priceCentsSnapshot, order.currency)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {item.coursePackage
                        ? `${item.coursePackage.items.length} คอร์ส`
                        : "คอร์สเดี่ยว"}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {(item.coursePackage?.items ?? []).map((packageCourse) => {
                      const enrolled = enrollmentCourseIds.has(
                        packageCourse.course.id,
                      );

                      return (
                        <div
                          className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface p-3 text-sm"
                          key={packageCourse.course.id}
                        >
                          <div>
                            <p className="font-bold text-ink">
                              {packageCourse.course.title}
                            </p>
                            <p className="text-xs text-ink-muted">
                              {packageCourse.course.category} ·{" "}
                              {packageCourse.course.level}
                            </p>
                          </div>
                          <Badge variant={enrolled ? "success" : "neutral"}>
                            {enrolled ? "เปิดสิทธิ์แล้ว" : "ยังไม่เปิดสิทธิ์"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="font-heading text-xl font-bold text-ink">
              สิทธิ์เข้าเรียน
            </h2>
            {order.status === "PAID" && order.enrollments.length > 0 ? (
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                เปิดสิทธิ์ให้ {order.user.name} แล้ว เมื่อนักเรียนเข้าสู่ระบบจะเห็นคอร์สในเมนู
                คอร์สของฉันและสามารถเข้าเรียนบทเรียนวิดีโอที่มีสิทธิ์ได้
              </p>
            ) : null}
            <div className="mt-4 grid gap-2">
              {order.enrollments.map((enrollment) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-3 text-sm"
                  key={enrollment.id}
                >
                  <span className="font-bold text-ink">
                    {enrollment.course.title}
                  </span>
                  <Badge variant="success">{enrollment.status}</Badge>
                </div>
              ))}
              {!order.enrollments.length ? (
                <p className="text-sm text-ink-muted">
                  ยังไม่มีสิทธิ์เข้าเรียน ระบบจะสร้างให้อัตโนมัติเมื่อยืนยันว่าชำระแล้ว
                </p>
              ) : null}
            </div>
          </Card>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <h2 className="font-heading text-xl font-bold text-ink">
              ข้อมูลลูกค้า
            </h2>
            <dl className="mt-5 grid gap-3 text-sm">
              <div>
                <dt className="font-bold text-ink">ชื่อ</dt>
                <dd className="mt-1 text-ink-muted">{order.customerName}</dd>
              </div>
              <div>
                <dt className="font-bold text-ink">อีเมล</dt>
                <dd className="mt-1 text-ink-muted">{order.customerEmail}</dd>
              </div>
              <div>
                <dt className="font-bold text-ink">โทรศัพท์</dt>
                <dd className="mt-1 text-ink-muted">
                  {order.customerPhone ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-ink">หมายเหตุ</dt>
                <dd className="mt-1 whitespace-pre-wrap text-ink-muted">
                  {order.note ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-ink">ชำระเมื่อ</dt>
                <dd className="mt-1 text-ink-muted">{formatDate(order.paidAt)}</dd>
              </div>
            </dl>
            <div className="mt-6 border-t border-line pt-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-ink">ยอดรวม</span>
                <span className="font-heading text-2xl font-bold text-primary-700">
                  {formatPrice(order.totalCents, order.currency)}
                </span>
              </div>
            </div>

            {canMutate ? (
              <div className="mt-6 grid gap-3">
                <form action={markOrderPaidAction}>
                  <input name="orderId" type="hidden" value={order.id} />
                  <Button fullWidth type="submit">
                    ยืนยันชำระแล้วและเปิดสิทธิ์เรียน
                  </Button>
                </form>
                <form action={cancelOrderAction}>
                  <input name="orderId" type="hidden" value={order.id} />
                  <Button fullWidth type="submit" variant="outline">
                    Cancel order
                  </Button>
                </form>
              </div>
            ) : null}
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

                {paymentSlipIsImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={`สลิปโอนเงินของคำสั่งซื้อ ${order.id}`}
                    className="max-h-[420px] w-full rounded-card border border-line object-contain"
                    src={paymentSlipUrl}
                  />
                ) : (
                  <iframe
                    className="h-[420px] w-full rounded-card border border-line bg-surface"
                    src={paymentSlipUrl}
                    title={`สลิปโอนเงินของคำสั่งซื้อ ${order.id}`}
                  />
                )}

                <Link
                  className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                  href={paymentSlipUrl}
                  target="_blank"
                >
                  เปิดสลิปเต็มหน้า
                </Link>
              </div>
            ) : (
              <p className="mt-3 rounded-card border border-dashed border-line p-4 text-sm text-ink-muted">
                ยังไม่มีสลิปโอนเงินแนบมากับคำสั่งซื้อนี้
              </p>
            )}
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}
