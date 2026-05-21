import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import {
  formatThaiBahtFromCents,
  getAdminCatalogErrorMessage,
  getAdminPackageList,
} from "@/lib/admin-catalog";
import {
  deletePackageAction,
  quickCreatePackageAction,
  quickUpdatePackageAction,
} from "@/lib/admin-catalog-actions";
import { requireAdmin } from "@/lib/admin";
import { formatPrice } from "@/lib/storefront";

type AdminPackagesPageProps = {
  searchParams?: {
    error?: string;
    q?: string;
    saved?: string;
  };
};

type AdminPackage = Awaited<ReturnType<typeof getAdminPackageList>>[number];

export default async function AdminPackagesPage({
  searchParams,
}: AdminPackagesPageProps) {
  await requireAdmin("/admin/packages");

  const query = searchParams?.q ?? "";
  const packages = await getAdminPackageList(query);
  const error = getAdminCatalogErrorMessage(searchParams?.error);

  return (
    <AdminShell
      title="จัดการแพ็กเกจ"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์" },
        { href: "/admin/courses", label: "คอร์ส" },
        { href: "/admin/packages", label: "แพ็กเกจ", active: true },
        { href: "/admin/videos", label: "วิดีโอ" },
      ]}
      actions={<ButtonLink href="/admin/packages/new" size="sm">หน้าเดิม</ButtonLink>}
    >
      <div className="grid gap-6">
        {error ? (
          <p className="rounded-card bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        {searchParams?.saved ? (
          <p className="rounded-card bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            บันทึกข้อมูลแล้ว
          </p>
        ) : null}

        <Card>
          <div className="mb-5">
            <p className="text-sm font-bold text-primary-700">Quick Add</p>
            <h2 className="font-heading text-xl font-bold text-ink">
              สร้างแพ็กเกจแยกไว้ก่อน
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              ตั้งชื่อก่อน ราคาเริ่มต้น 0 บาท แล้วค่อยตั้งราคา/Ready ทีหลัง
            </p>
          </div>
          <form
            action={quickCreatePackageAction}
            className="grid gap-3 sm:grid-cols-[1fr_auto]"
          >
            <Input label="ชื่อแพ็กเกจ" name="title" required />
            <div className="flex items-end">
              <Button fullWidth type="submit">
                Add Draft
              </Button>
            </div>
          </form>
        </Card>

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
              header: "แก้ไขแพ็กเกจ",
              cell: (coursePackage) => (
                <form
                  action={quickUpdatePackageAction}
                  className="grid min-w-[260px] gap-2"
                >
                  <input name="packageId" type="hidden" value={coursePackage.id} />
                  <Input
                    defaultValue={coursePackage.title}
                    label="ชื่อแพ็กเกจ"
                    name="title"
                    required
                    size="sm"
                  />
                  <p className="mt-1 text-xs text-ink-muted">
                    {coursePackage.slug}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-[1fr_92px]">
                    <Input
                      defaultValue={formatThaiBahtFromCents(coursePackage.priceCents)}
                      label="ราคา"
                      min="0"
                      name="priceThb"
                      required
                      size="sm"
                      type="number"
                    />
                    <Select
                      defaultValue={coursePackage.currency || "THB"}
                      label="สกุล"
                      name="currency"
                      required
                      size="sm"
                    >
                      <option value="THB">THB</option>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      defaultValue={coursePackage.isPublished ? "READY" : "DRAFT"}
                      name="status"
                      size="sm"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="READY">Ready</option>
                    </Select>
                    <Button size="sm" type="submit">
                      Save
                    </Button>
                  </div>
                </form>
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
                  {coursePackage.isPublished ? "Ready" : "Draft"}
                </Badge>
              ),
            },
            {
              key: "action",
              header: "จัดการ",
              align: "right",
              cell: (coursePackage) => (
                <div className="flex flex-wrap justify-end gap-2">
                  <ButtonLink
                    href={`/admin/packages/${coursePackage.id}/edit`}
                    size="sm"
                    variant="outline"
                  >
                    คอร์สในแพ็กเกจ
                  </ButtonLink>
                  <form action={deletePackageAction}>
                    <input name="packageId" type="hidden" value={coursePackage.id} />
                    <Button size="sm" type="submit" variant="danger">
                      Delete
                    </Button>
                  </form>
                </div>
              ),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
