"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  clearCartPackages,
  readCartPackageIds,
  removeCartPackage,
} from "@/components/public/cart-storage";
import type { StorefrontPackage } from "@/lib/storefront";
import { formatPrice } from "@/lib/storefront";

type CartClientProps = {
  packages: StorefrontPackage[];
};

export function CartClient({ packages }: CartClientProps) {
  const [cartIds, setCartIds] = useState<string[]>([]);

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

  function removePackage(packageId: string) {
    removeCartPackage(packageId);
    setCartIds(readCartPackageIds());
  }

  function clearCart() {
    clearCartPackages();
    setCartIds([]);
  }

  if (!cartPackages.length) {
    return (
      <EmptyState
        title="ตะกร้ายังว่าง"
        description="เลือกแพ็กเกจคอร์สที่ต้องการ แล้วกลับมาสร้างคำสั่งซื้อได้ที่นี่"
        action={<ButtonLink href="/courses">เลือกแพ็กเกจ</ButtonLink>}
        tone="primary"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="grid gap-4">
        {cartPackages.map((coursePackage) => (
          <Card key={coursePackage.id} className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-bold text-primary-700">แพ็กเกจคอร์ส</p>
              <h2 className="mt-1 font-heading text-xl font-bold text-ink">
                {coursePackage.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                {coursePackage.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink-muted">
                <span>{coursePackage.courseCount} คอร์ส</span>
                <span>{coursePackage.lessonCount} บทเรียน</span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <p className="font-heading text-xl font-bold text-primary-700">
                {formatPrice(coursePackage.priceCents, coursePackage.currency)}
              </p>
              <Button
                onClick={() => removePackage(coursePackage.id)}
                size="sm"
                variant="outline"
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
            {formatPrice(totalCents)}
          </p>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            ยังไม่ชำระเงินจริง ระบบจะสร้างคำสั่งซื้อให้ผู้ดูแลตรวจสอบและยืนยันการชำระเงิน
          </p>
          <div className="mt-6 grid gap-3">
            <ButtonLink href="/checkout" fullWidth>
              ไปขั้นตอนยืนยันคำสั่งซื้อ
            </ButtonLink>
            <Button onClick={clearCart} fullWidth variant="ghost">
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
