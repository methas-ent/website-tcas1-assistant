import { CourseCatalogClient } from "@/components/public/CourseCatalogClient";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { getStorefrontCatalog } from "@/lib/storefront";

export default async function CoursesPage() {
  const catalog = await getStorefrontCatalog();

  return (
    <div className="min-h-screen bg-surface-soft">
      <PublicHeader
        actions={
          <ButtonLink href="/cart" size="sm" variant="outline">
            ตะกร้า
          </ButtonLink>
        }
      />
      <main>
        <PageHeader
          eyebrow="Catalog"
          title="คอร์สและแพ็กเกจทั้งหมด"
          description="ค้นหาคอร์ส เลือกหมวดหมู่ และเพิ่มแพ็กเกจที่ต้องการลงตะกร้า"
        />
        <section className="mx-auto max-w-7xl px-page py-8">
          <CourseCatalogClient {...catalog} />
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
