"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  clearCartItems,
  readCartItems,
  removeCartItem,
  type CartItem,
} from "@/components/public/cart-storage";
import { formatPrice } from "@/lib/formatters";
import type { StorefrontCourse, StorefrontPackage } from "@/lib/storefront";

type CartClientProps = {
  packages: StorefrontPackage[];
  courses: StorefrontCourse[];
};

type ResolvedCartLine =
  | {
      type: "package";
      id: string;
      title: string;
      description: string;
      priceCents: number;
      currency: string;
      courseCount: number;
      lessonCount: number;
    }
  | {
      type: "course";
      id: string;
      title: string;
      description: string;
      priceCents: number;
      currency: string;
      chapterCount: number;
      lessonCount: number;
    };

export function CartClient({ packages, courses }: CartClientProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setCartItems(readCartItems());
  }, []);

  const cartLines = useMemo<ResolvedCartLine[]>(() => {
    const packageMap = new Map(packages.map((entry) => [entry.id, entry]));
    const courseMap = new Map(courses.map((entry) => [entry.id, entry]));

    return cartItems
      .map((item): ResolvedCartLine | null => {
        if (item.type === "package") {
          const pkg = packageMap.get(item.id);
          if (!pkg) {
            return null;
          }
          return {
            type: "package",
            id: pkg.id,
            title: pkg.title,
            description: pkg.description,
            priceCents: pkg.priceCents,
            currency: pkg.currency,
            courseCount: pkg.courseCount,
            lessonCount: pkg.lessonCount,
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
          description: course.description,
          priceCents: course.priceCents,
          currency: course.currency,
          chapterCount: course.chapterCount,
          lessonCount: course.lessonCount,
        };
      })
      .filter((line): line is ResolvedCartLine => Boolean(line));
  }, [cartItems, courses, packages]);

  const totalCents = cartLines.reduce((sum, line) => sum + line.priceCents, 0);
  const currency = cartLines[0]?.currency ?? "THB";

  function handleRemove(line: ResolvedCartLine) {
    removeCartItem({ type: line.type, id: line.id });
    setCartItems(readCartItems());
  }

  function handleClear() {
    clearCartItems();
    setCartItems([]);
  }

  if (!cartLines.length) {
    return (
      <EmptyState
        title="ตะกร้ายังว่าง"
        description="เลือกคอร์สหรือแพ็กเกจที่ต้องการ แล้วกลับมาสร้างคำสั่งซื้อได้ที่นี่"
        action={<ButtonLink href="/courses">เลือกคอร์ส</ButtonLink>}
        tone="primary"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid gap-4">
        {cartLines.map((line) => (
          <Card
            key={`${line.type}:${line.id}`}
            className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div>
              <p className="text-xs font-bold text-primary-700">
                {line.type === "package" ? "แพ็กเกจคอร์ส" : "คอร์สเรียน"}
              </p>
              <h2 className="mt-1 font-heading text-xl font-bold text-ink">
                {line.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                {line.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-ink-muted">
                {line.type === "package" ? (
                  <span>{line.courseCount} คอร์ส</span>
                ) : (
                  <span>{line.chapterCount} บท</span>
                )}
                <span>{line.lessonCount} บทเรียน</span>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              <p className="font-heading text-xl font-bold text-primary-700">
                {formatPrice(line.priceCents, line.currency)}
              </p>
              <Button
                onClick={() => handleRemove(line)}
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
              >
                นำออก
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <p className="text-sm font-bold text-ink-muted">ยอดรวม</p>
          <p className="mt-2 font-heading text-3xl font-bold text-ink">
            {formatPrice(totalCents, currency)}
          </p>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            ยังไม่ชำระเงินจริง ระบบจะสร้างคำสั่งซื้อให้ผู้ดูแลตรวจสอบและยืนยันการชำระเงิน
          </p>
          <div className="mt-6 grid gap-3">
            <ButtonLink href="/checkout" fullWidth>
              ไปขั้นตอนยืนยันคำสั่งซื้อ
            </ButtonLink>
            <Button onClick={handleClear} fullWidth variant="ghost">
              ล้างตะกร้า
            </Button>
            <Link
              className="text-center text-sm font-bold text-primary-700 hover:text-primary-600"
              href="/courses"
            >
              เลือกคอร์สเพิ่ม
            </Link>
          </div>
        </Card>
      </aside>
    </div>
  );
}
