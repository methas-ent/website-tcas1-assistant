import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  formatThaiBahtFromCents,
  getAdminCatalogErrorMessage,
  getAdminCourseOptions,
  getAdminPackageEdit,
} from "@/lib/admin-catalog";
import { updatePackageAction } from "@/lib/admin-catalog-actions";
import { requireAdmin } from "@/lib/admin";
import {
  getGradeLevelLabel,
  getSubjectCategoryLabel,
} from "@/lib/course-taxonomy";

type EditPackagePageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    error?: string;
    saved?: string;
  };
};

export default async function EditPackagePage({
  params,
  searchParams,
}: EditPackagePageProps) {
  await requireAdmin(`/admin/packages/${params.id}/edit`);

  const [coursePackage, courses] = await Promise.all([
    getAdminPackageEdit(params.id),
    getAdminCourseOptions(),
  ]);

  if (!coursePackage) {
    notFound();
  }

  const selectedCourseIds = new Set(
    coursePackage.items.map((item) => item.courseId),
  );
  const error = getAdminCatalogErrorMessage(searchParams?.error);

  return (
    <AdminShell
      title="แก้ไขแพ็กเกจ"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์" },
        { href: "/admin/courses", label: "คอร์ส" },
        { href: "/admin/packages", label: "แพ็กเกจ", active: true },
      ]}
      actions={
        <ButtonLink href="/admin/packages" size="sm" variant="outline">
          กลับรายการแพ็กเกจ
        </ButtonLink>
      }
    >
      <Card className="max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-primary-700">แพ็กเกจ</p>
            <h1 className="font-heading text-2xl font-bold text-ink">
              {coursePackage.title}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">{coursePackage.slug}</p>
          </div>
          <Badge variant={coursePackage.isPublished ? "success" : "neutral"} size="md">
            {coursePackage.isPublished ? "Published" : "Draft"}
          </Badge>
        </div>

        {error ? (
          <p className="mt-5 rounded-card bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        {searchParams?.saved ? (
          <p className="mt-5 rounded-card bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            บันทึกข้อมูลแล้ว
          </p>
        ) : null}

        <form action={updatePackageAction} className="mt-6 grid gap-4">
          <input name="packageId" type="hidden" value={coursePackage.id} />
          <Input
            defaultValue={coursePackage.title}
            label="ชื่อแพ็กเกจ"
            name="title"
            required
          />
          <Input
            defaultValue={coursePackage.slug}
            label="Slug"
            name="slug"
            required
          />
          <Textarea
            defaultValue={coursePackage.description}
            label="รายละเอียด"
            name="description"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              defaultValue={formatThaiBahtFromCents(coursePackage.priceCents)}
              label="ราคา (บาท)"
              min="0"
              name="priceThb"
              required
              type="number"
            />
            <Input
              defaultValue={coursePackage.currency}
              label="สกุลเงิน"
              name="currency"
              required
            />
          </div>
          <Input
            defaultValue={coursePackage.coverImageUrl ?? ""}
            label="URL รูปปก"
            name="coverImageUrl"
          />
          <label className="flex items-center gap-3 text-sm font-bold text-ink">
            <input
              className="h-4 w-4"
              defaultChecked={coursePackage.isPublished}
              name="isPublished"
              type="checkbox"
            />
            เผยแพร่แพ็กเกจนี้
          </label>

          <section className="rounded-card border border-line bg-surface-soft p-4">
            <h2 className="font-heading text-lg font-bold text-ink">
              คอร์สในแพ็กเกจ
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              ลำดับในแพ็กเกจจะเรียงตามลำดับ checkbox ที่แสดงในหน้านี้
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {courses.map((course) => (
                <label
                  className="flex items-start gap-3 rounded-card border border-line bg-surface p-3 text-sm"
                  key={course.id}
                >
                  <input
                    className="mt-1 h-4 w-4"
                    defaultChecked={selectedCourseIds.has(course.id)}
                    name="courseIds"
                    type="checkbox"
                    value={course.id}
                  />
                  <span>
                    <span className="block font-bold text-ink">{course.title}</span>
                    <span className="block text-xs text-ink-muted">
                      {getSubjectCategoryLabel(
                        course.subjectCategory,
                        course.category,
                      )} ·{" "}
                      {getGradeLevelLabel(course.gradeLevel, course.level)} ·{" "}
                      {course.isPublished ? "Published" : "Draft"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <Button type="submit">บันทึกแพ็กเกจ</Button>
        </form>
      </Card>
    </AdminShell>
  );
}
