import { CartClient } from "@/components/public/CartClient";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getPublishedCourses,
  getPublishedPackages,
} from "@/lib/storefront";

export default async function CartPage() {
  const [packages, courses] = await Promise.all([
    getPublishedPackages(),
    getPublishedCourses(),
  ]);

  return (
    <div className="min-h-screen bg-surface-soft">
      <PublicHeader
        actions={
          <ButtonLink href="/courses" size="sm" variant="outline">
            เลือกคอร์ส
          </ButtonLink>
        }
      />
      <main>
        <PageHeader
          eyebrow="Cart"
          title="ตะกร้าของฉัน"
          description="ตรวจสอบรายการคอร์สและแพ็กเกจก่อนเข้าสู่ขั้นตอนสร้างคำสั่งซื้อ"
          tone="neutral"
        />
        <section className="mx-auto max-w-7xl px-page py-8">
          <CartClient courses={courses} packages={packages} />
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
