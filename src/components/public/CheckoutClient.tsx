"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  clearCartItems,
  readCartItems,
  type CartItem,
} from "@/components/public/cart-storage";
import { formatPrice } from "@/lib/formatters";
import type { StorefrontCourse, StorefrontPackage } from "@/lib/storefront";

type CheckoutClientProps = {
  customerEmail: string;
  customerName: string;
  packages: StorefrontPackage[];
  courses: StorefrontCourse[];
};

type CheckoutState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; orderId: string }
  | { status: "error"; message: string };

type CheckoutLine =
  | {
      type: "package";
      id: string;
      title: string;
      priceCents: number;
      currency: string;
      subtitle: string;
    }
  | {
      type: "course";
      id: string;
      title: string;
      priceCents: number;
      currency: string;
      subtitle: string;
    };

export function CheckoutClient({
  customerEmail,
  customerName,
  packages,
  courses,
}: CheckoutClientProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [state, setState] = useState<CheckoutState>({ status: "idle" });

  useEffect(() => {
    setCartItems(readCartItems());
  }, []);

  const cartLines = useMemo<CheckoutLine[]>(() => {
    const packageMap = new Map(packages.map((entry) => [entry.id, entry]));
    const courseMap = new Map(courses.map((entry) => [entry.id, entry]));

    return cartItems
      .map((item): CheckoutLine | null => {
        if (item.type === "package") {
          const pkg = packageMap.get(item.id);
          if (!pkg) {
            return null;
          }
          return {
            type: "package",
            id: pkg.id,
            title: pkg.title,
            priceCents: pkg.priceCents,
            currency: pkg.currency,
            subtitle: `${pkg.courseCount} คอร์ส`,
          };
        }
        const course = courseMap.get(item.id);
        if (!course) {
          return null;
        }
        return {
          type: "course",
          id: course.id,
          title: course.title,
          priceCents: course.priceCents,
          currency: course.currency,
          subtitle: `${course.chapterCount} บท · ${course.lessonCount} บทเรียน`,
        };
      })
      .filter((line): line is CheckoutLine => Boolean(line));
  }, [cartItems, courses, packages]);

  const totalCents = cartLines.reduce((sum, line) => sum + line.priceCents, 0);
  const currency = cartLines[0]?.currency ?? "THB";

  async function submitCheckout(formData: FormData) {
    setState({ status: "submitting" });

    const checkoutForm = new FormData();

    cartLines.forEach((line) => {
      if (line.type === "package") {
        checkoutForm.append("packageIds", line.id);
      } else {
        checkoutForm.append("courseIds", line.id);
      }
    });
    checkoutForm.append("customerPhone", String(formData.get("customerPhone") ?? ""));
    checkoutForm.append("note", String(formData.get("note") ?? ""));

    const paymentSlip = formData.get("paymentSlip");

    if (paymentSlip instanceof File) {
      checkoutForm.append("paymentSlip", paymentSlip);
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      body: checkoutForm,
    });

    const result = (await response.json()) as {
      error?: string;
      orderId?: string;
    };

    if (!response.ok || !result.orderId) {
      setState({
        status: "error",
        message: result.error ?? "สร้างคำสั่งซื้อไม่สำเร็จ",
      });
      return;
    }

    clearCartItems();
    setCartItems([]);
    setState({ status: "success", orderId: result.orderId });
  }

  if (state.status === "success") {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold text-primary-700">ส่งคำสั่งซื้อแล้ว</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">
          รอผู้ดูแลตรวจสอบการชำระเงิน
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          เลขคำสั่งซื้อ {state.orderId} พร้อมสลิปโอนเงินถูกบันทึกในระบบแล้ว
          เมื่อผู้ดูแลตรวจสอบและยืนยันสถานะเป็นชำระเงินแล้ว ระบบจะเปิดสิทธิ์คอร์สให้ในบัญชีนักเรียน
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

  if (!cartLines.length) {
    return (
      <EmptyState
        title="ไม่มีรายการสำหรับ checkout"
        description="กลับไปเลือกคอร์สหรือแพ็กเกจก่อนสร้างคำสั่งซื้อ"
        action={<ButtonLink href="/courses">เลือกคอร์ส</ButtonLink>}
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

        <Card>
          <h2 className="font-heading text-xl font-bold text-ink">
            สลิปโอนเงิน
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            แนบหลักฐานการโอนเงินเพื่อให้ผู้ดูแลตรวจสอบและเปิดสิทธิ์เข้าเรียน
          </p>
          <label className="mt-5 grid gap-1.5">
            <span className="text-sm font-bold text-ink-soft">
              แนบ Slip โอนเงิน
            </span>
            <input
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-sm transition file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:border-primary-200 focus:border-primary-300 focus:outline-none focus:ring-4 focus:ring-primary-100"
              name="paymentSlip"
              required
              type="file"
            />
            <span className="text-xs text-ink-muted">
              รองรับ JPG, PNG, WebP หรือ PDF ขนาดไม่เกิน 10MB
            </span>
          </label>
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
            {cartLines.map((line) => (
              <div
                className="grid gap-2 border-b border-line pb-3 last:border-0 last:pb-0 sm:flex sm:items-start sm:justify-between sm:gap-3"
                key={`${line.type}:${line.id}`}
              >
                <div>
                  <p className="text-xs font-bold text-primary-700">
                    {line.type === "package" ? "แพ็กเกจ" : "คอร์ส"}
                  </p>
                  <p className="mt-1 font-bold text-ink">{line.title}</p>
                  <p className="text-xs text-ink-muted">{line.subtitle}</p>
                </div>
                <p className="shrink-0 font-bold text-primary-700 sm:text-right">
                  {formatPrice(line.priceCents, line.currency)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-line pt-5">
            <span className="font-bold text-ink">ยอดรวม</span>
            <span className="font-heading text-2xl font-bold text-primary-700">
              {formatPrice(totalCents, currency)}
            </span>
          </div>
        </Card>
      </aside>
    </div>
  );
}
