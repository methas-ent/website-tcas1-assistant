"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";

export type PayTimeStatusResponse = {
  eligibility: "OK" | "NEVER_ENROLLED" | "NOT_ENABLED" | "LESSON_NOT_FOUND";
  priceCents: number;
  hours: number;
  currency: string;
  description: string | null;
  activeExtension: {
    expiresAt: string;
    hoursGranted: number;
  } | null;
  pendingOrderId: string | null;
};

type CheckoutResponse = {
  orderId: string;
  status: string;
  priceCents: number;
  hoursSnapshot: number;
  expectedTotalThb: string;
  currency: string;
};

export type PayTimeModalProps = {
  open: boolean;
  lessonId: string;
  defaultName: string;
  defaultEmail: string;
  status: PayTimeStatusResponse | null;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: (orderId: string) => void;
};

type Step = "confirm" | "upload" | "submitted";

function formatPriceThb(priceCents: number) {
  return (priceCents / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PayTimeModal({
  open,
  lessonId,
  defaultName,
  defaultEmail,
  status,
  onOpenChange,
  onSubmitted,
}: PayTimeModalProps) {
  const [step, setStep] = useState<Step>("confirm");
  const [customerName, setCustomerName] = useState(defaultName);
  const [customerEmail, setCustomerEmail] = useState(defaultEmail);
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<CheckoutResponse | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("confirm");
      setSlipFile(null);
      setError(null);
      setOrderResult(null);
      setSubmitting(false);
      return;
    }

    setCustomerName(defaultName);
    setCustomerEmail(defaultEmail);
  }, [open, defaultName, defaultEmail]);

  const priceLabel = useMemo(() => {
    if (!status || status.eligibility !== "OK") {
      return "—";
    }

    return `${formatPriceThb(status.priceCents)} ${status.currency}`;
  }, [status]);

  const submitOrder = useCallback(async () => {
    if (!slipFile) {
      setError("กรุณาแนบสลิปโอนเงิน");
      return;
    }

    if (!customerName.trim() || !customerEmail.trim()) {
      setError("กรุณากรอกชื่อและอีเมลผู้สั่งซื้อ");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("lessonId", lessonId);
    formData.append("customerName", customerName.trim());
    formData.append("customerEmail", customerEmail.trim());

    if (customerPhone.trim()) {
      formData.append("customerPhone", customerPhone.trim());
    }

    if (note.trim()) {
      formData.append("note", note.trim());
    }

    formData.append("paymentSlip", slipFile);

    try {
      const response = await fetch("/api/pay-time/checkout", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | (CheckoutResponse & { error?: string; message?: string })
        | null;

      if (!response.ok || !payload || !payload.orderId) {
        setError(payload?.message ?? "ไม่สามารถส่งคำสั่งซื้อได้");
        setSubmitting(false);
        return;
      }

      setOrderResult({
        orderId: payload.orderId,
        status: payload.status,
        priceCents: payload.priceCents,
        hoursSnapshot: payload.hoursSnapshot,
        expectedTotalThb: payload.expectedTotalThb,
        currency: payload.currency,
      });
      setStep("submitted");
      onSubmitted?.(payload.orderId);
    } catch (cause) {
      console.error(cause);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  }, [
    customerEmail,
    customerName,
    customerPhone,
    lessonId,
    note,
    onSubmitted,
    slipFile,
  ]);

  if (!status) {
    return null;
  }

  if (status.eligibility !== "OK") {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="ซื้อเวลาดูเพิ่ม"
        description={
          status.eligibility === "NEVER_ENROLLED"
            ? "ต้องเคยลงทะเบียนเรียนคอร์สนี้มาก่อนถึงจะซื้อเวลาดูได้"
            : status.eligibility === "NOT_ENABLED"
              ? "บทเรียนนี้ยังไม่ได้เปิดให้ซื้อเวลาดู"
              : "ไม่พบบทเรียนที่เลือก"
        }
        footer={
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
        }
      />
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="ซื้อเวลาดูเพิ่ม (Pay Time)"
      description="ขยายเวลาดูบทเรียนนี้เพิ่มเติม ไม่ส่งผลต่อสิทธิ์คอร์สเดิม"
    >
      {step === "confirm" ? (
        <div className="grid gap-4">
          <Card variant="soft" padding="md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
                  ราคาที่ต้องชำระ
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-ink">
                  {priceLabel}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
                  เวลาที่ได้รับ
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-ink">
                  {status.hours} ชั่วโมง
                </p>
              </div>
            </div>
            {status.description ? (
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                {status.description}
              </p>
            ) : null}
          </Card>

          <Card variant="outline" padding="md">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
              ข้อมูลการโอนเงิน
            </p>
            <div className="mt-2 grid gap-1 text-sm text-ink">
              <p>ธนาคาร: กรุงไทย</p>
              <p>เลขบัญชี: 000-0-00000-0</p>
              <p>ชื่อบัญชี: WePlus Online Academy</p>
            </div>
            <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-line bg-surface-soft p-6 text-center text-xs text-ink-muted">
              QR Code (ตัวอย่าง)
              <br />
              ให้โอนตามจำนวนด้านบนแล้วอัปโหลดสลิป
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button onClick={() => setStep("upload")}>ถัดไป - อัปโหลดสลิป</Button>
          </div>
        </div>
      ) : null}

      {step === "upload" ? (
        <div className="grid gap-4">
          <Input
            label="ชื่อผู้สั่งซื้อ"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            required
          />
          <Input
            label="อีเมล"
            type="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            required
          />
          <Input
            label="เบอร์โทร (ไม่บังคับ)"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
          />
          <Input
            label="หมายเหตุ (ไม่บังคับ)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="grid gap-1.5">
            <label
              className="text-sm font-bold text-ink-soft"
              htmlFor="pay-time-slip"
            >
              สลิปโอนเงิน (JPG / PNG / WebP / PDF)
            </label>
            <input
              id="pay-time-slip"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) =>
                setSlipFile(event.target.files?.[0] ?? null)
              }
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm"
              required
            />
            {slipFile ? (
              <p className="text-xs text-ink-muted">
                ไฟล์: {slipFile.name} ({Math.round(slipFile.size / 1024)} KB)
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-2xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setStep("confirm")}
              disabled={submitting}
            >
              ย้อนกลับ
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={submitOrder}
                disabled={submitting || !slipFile}
              >
                {submitting ? "กำลังส่ง..." : "ส่งคำสั่งซื้อ"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {step === "submitted" && orderResult ? (
        <div className="grid gap-4">
          <Card variant="soft" padding="md">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
              สถานะ
            </p>
            <p className="mt-1 font-heading text-xl font-bold text-ink">
              รอตรวจสอบสลิป
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              ทีมงานจะอนุมัติคำสั่งซื้อหลังตรวจสอบสลิปเรียบร้อยแล้ว
              เวลาดูจะถูกเพิ่มให้อัตโนมัติ
            </p>
          </Card>
          <div className="grid gap-1 text-sm text-ink">
            <p>
              เลขที่คำสั่งซื้อ: <span className="font-bold">{orderResult.orderId}</span>
            </p>
            <p>
              ยอดที่ต้องชำระ: {orderResult.expectedTotalThb} {orderResult.currency}
            </p>
            <p>เวลาที่จะได้รับเมื่อได้รับอนุมัติ: {orderResult.hoursSnapshot} ชั่วโมง</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStep("confirm");
                setSlipFile(null);
              }}
            >
              สั่งซื้ออีกรายการ
            </Button>
            <Button onClick={() => onOpenChange(false)}>เสร็จสิ้น</Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
