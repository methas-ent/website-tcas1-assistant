import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { getAdminPackageList } from "@/lib/admin-catalog";
import { requireAdmin } from "@/lib/admin";
import { formatPrice } from "@/lib/storefront";

type AdminPackagesPageProps = {
  searchParams?: {
    q?: string;
  };
};

type AdminPackage = Awaited<ReturnType<typeof getAdminPackageList>>[number];

export default async function AdminPackagesPage({
  searchParams,
}: AdminPackagesPageProps) {
  await requireAdmin("/admin/packages");

  const query = searchParams?.q ?? "";
  const packages = await getAdminPackageList(query);

  return (
    <AdminShell
      title="จัดการแพ็กเกจ"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์" },
        { href: "/admin/courses", label: "คอร์ส" },
        { href: "/admin/packages", label: "แพ็กเกจ", active: true },
      ]}
      actions={
        <ButtonLink href="/admin/packages/new" size="sm">
          สร้างแพ็กเกจ
        </ButtonLink>
      }
    >
      <div className="grid gap-6">
        <Card>
          <form className="grid gap-3 sm:grid-cols-[1fr_auto]" method="get">
            <Input
              defaultValue={query}
              label="ค้นหาแพ็กเกจ"
              name="q"
              placeholder="ชื่อแพ็กเกจ, slug, description"
            />
            <div className="flex items-end gap-2">
              <Button type="submit">ค้นหา</Button>
              <ButtonLink href="/admin/packages" variant="outline">
                ล้าง
              </ButtonLink>
            </div>
          </form>
        </Card>

        <Table<AdminPackage>
          data={packages}
          emptyTitle="ยังไม่มีแพ็กเกจ"
          emptyDescription="สร้างแพ็กเกจเพื่อให้ผู้เรียนเพิ่มลงตะกร้าได้"
          getRowKey={(coursePackage) => coursePackage.id}
          columns={[
            {
              key: "title",
              header: "แพ็กเกจ",
              cell: (coursePackage) => (
                <div>
                  <Link
                    className="font-bold text-primary-700 hover:text-primary-600"
                    href={`/admin/packages/${coursePackage.id}/edit`}
                  >
                    {coursePackage.title}
                  </Link>
                  <p className="mt-1 text-xs text-ink-muted">
                    {coursePackage.slug}
                  </p>
                </div>
              ),
            },
            {
              key: "price",
              header: "ราคา",
              cell: (coursePackage) => (
                <span className="font-bold text-ink">
                  {formatPrice(coursePackage.priceCents, coursePackage.currency)}
                </span>
              ),
            },
            {
              key: "courses",
              header: "คอร์ส",
              cell: (coursePackage) => (
                <span>{coursePackage._count.items} คอร์ส</span>
              ),
            },
            {
              key: "orders",
              header: "ออเดอร์",
              cell: (coursePackage) => (
                <span>{coursePackage._count.orderItems} รายการ</span>
              ),
            },
            {
              key: "status",
              header: "สถานะ",
              cell: (coursePackage) => (
                <Badge variant={coursePackage.isPublished ? "success" : "neutral"}>
                  {coursePackage.isPublished ? "Published" : "Draft"}
                </Badge>
              ),
            },
            {
              key: "action",
              header: "แก้ไข",
              align: "right",
              cell: (coursePackage) => (
                <ButtonLink
                  href={`/admin/packages/${coursePackage.id}/edit`}
                  size="sm"
                  variant="outline"
                >
                  Edit
                </ButtonLink>
              ),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
