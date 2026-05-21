import { redirect } from "next/navigation";
import { CheckoutClient } from "@/components/public/CheckoutClient";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentUser, isStudent } from "@/lib/auth";
import { getPublishedPackages } from "@/lib/storefront";

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  if (!isStudent(user)) {
    redirect("/login?next=/checkout");
  }

  const packages = await getPublishedPackages();

  return (
    <div className="min-h-screen bg-surface-soft">
      <PublicHeader />
      <main>
        <PageHeader
          eyebrow="Checkout"
          title="ยืนยันคำสั่งซื้อ"
          description="ยังไม่มีการเชื่อมต่อ payment gateway ระบบจะบันทึกคำสั่งซื้อเพื่อให้ผู้ดูแลตรวจสอบ"
          tone="neutral"
        />
        <section className="mx-auto max-w-7xl px-page py-8">
          <CheckoutClient
            customerEmail={user!.email}
            customerName={user!.name}
            packages={packages}
          />
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
