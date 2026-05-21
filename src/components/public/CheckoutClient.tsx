"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  clearCartPackages,
  readCartPackageIds,
} from "@/components/public/cart-storage";
import { formatPrice } from "@/lib/formatters";
import type { StorefrontPackage } from "@/lib/storefront";

type CheckoutClientProps = {
  customerEmail: string;
  customerName: string;
  packages: StorefrontPackage[];
};

type CheckoutState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; orderId: string }
  | { status: "error"; message: string };

export function CheckoutClient({
  customerEmail,
  customerName,
  packages,
}: CheckoutClientProps) {
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [state, setState] = useState<CheckoutState>({ status: "idle" });

  useEffect(() => {
    setCartIds(readCartPackageIds());
  }, []);

  const cartPackages = useMemo(() => {
    const packageMap = new Map(packages.map((coursePackage) => [coursePackage.id, coursePackage]));
    return cartIds
      .map((id) => packageMap.get(id))
      .filter((coursePackage): coursePackage is StorefrontPackage => Boolean(coursePackage));
  }, [cartIds, packages]);

  const totalCents = cartPackages.reduce(
    (sum, coursePackage) => sum + coursePackage.priceCents,
    0,
  );

  async function submitCheckout(formData: FormData) {
    setState({ status: "submitting" });

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageIds: cartPackages.map((coursePackage) => coursePackage.id),
        customerPhone: String(formData.get("customerPhone") ?? ""),
        note: String(formData.get("note") ?? ""),
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      orderId?: string;
    };

    if (!response.ok || !payload.orderId) {
      setState({
        status: "error",
        message: payload.error ?? "สร้างคำสั่งซื้อไม่สำเร็จ",
      });
      return;
    }

    clearCartPackages();
    setCartIds([]);
    setState({ status: "success", orderId: payload.orderId });
  }

  if (state.status === "success") {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold text-primary-700">ส่งคำสั่งซื้อแล้ว</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">
          รอผู้ดูแลตรวจสอบการชำระเงิน
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          เลขคำสั่งซื้อ {state.orderId} ถูกบันทึกในระบบแล้ว เมื่อผู้ดูแลยืนยันสถานะเป็นชำระเงินแล้ว
          ระบบจะเปิดสิทธิ์คอร์สให้ในบัญชีนักเรียน
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/courses" variant="outline">
            ดูคอร์สเพิ่มเติม
          </ButtonLink>
          <ButtonLink href="/">กลับหน้าแรก</ButtonLink>
        </div>
      </Card>
    );
  }

  if (!cartPackages.length) {
    return (
      <EmptyState
        title="ไม่มีรายการสำหรับ checkout"
        description="กลับไปเลือกแพ็กเกจคอร์สก่อนสร้างคำสั่งซื้อ"
        action={<ButtonLink href="/courses">เลือกแพ็กเกจ</ButtonLink>}
        tone="primary"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        className="grid gap-4"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void submitCheckout(new FormData(event.currentTarget));
        }}
      >
        <Card>
          <h2 className="font-heading text-xl font-bold text-ink">
            ข้อมูลผู้เรียน
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input label="ชื่อ" value={customerName} readOnly />
            <Input label="อีเมล" value={customerEmail} readOnly />
            <Input
              label="เบอร์ติดต่อ"
              name="customerPhone"
              placeholder="เช่น 0812345678"
            />
            <Textarea
              label="หมายเหตุถึงผู้ดูแล"
              name="note"
              placeholder="แจ้งรายละเอียดการโอน หรือคำถามเพิ่มเติม"
            />
          </div>
        </Card>

        {state.status === "error" ? (
          <p className="rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {state.message}
          </p>
        ) : null}

        <Button
          disabled={state.status === "submitting"}
          fullWidth
          size="lg"
          type="submit"
        >
          {state.status === "submitting"
            ? "กำลังสร้างคำสั่งซื้อ..."
            : "ยืนยันคำสั่งซื้อ"}
        </Button>
      </form>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <h2 className="font-heading text-lg font-bold text-ink">สรุปรายการ</h2>
          <div className="mt-4 grid gap-3">
            {cartPackages.map((coursePackage) => (
              <div
                className="grid gap-2 border-b border-line pb-3 last:border-0 last:pb-0 sm:flex sm:items-start sm:justify-between sm:gap-3"
                key={coursePackage.id}
              >
                <div>
                  <p className="font-bold text-ink">{coursePackage.title}</p>
                  <p className="text-xs text-ink-muted">
                    {coursePackage.courseCount} คอร์ส
                  </p>
                </div>
                <p className="shrink-0 font-bold text-primary-700 sm:text-right">
                  {formatPrice(coursePackage.priceCents, coursePackage.currency)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-line pt-5">
            <span className="font-bold text-ink">ยอดรวม</span>
            <span className="font-heading text-2xl font-bold text-primary-700">
              {formatPrice(totalCents)}
            </span>
          </div>
        </Card>
      </aside>
    </div>
  );
}
