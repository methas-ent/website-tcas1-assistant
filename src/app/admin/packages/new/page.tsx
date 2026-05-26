import { AdminShell } from "@/components/admin/AdminShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  getAdminCatalogErrorMessage,
  getAdminCourseOptions,
} from "@/lib/admin-catalog";
import { createPackageAction } from "@/lib/admin-catalog-actions";
import { requireAdmin } from "@/lib/admin";
import {
  getGradeLevelLabel,
  getSubjectCategoryLabel,
} from "@/lib/course-taxonomy";

type NewPackagePageProps = {
  searchParams?: {
    error?: string;
  };
};

export default async function NewPackagePage({
  searchParams,
}: NewPackagePageProps) {
  await requireAdmin("/admin/packages/new");

  const [courses, error] = await Promise.all([
    getAdminCourseOptions(),
    Promise.resolve(getAdminCatalogErrorMessage(searchParams?.error)),
  ]);

  return (
    <AdminShell
      title="สร้างแพ็กเกจ"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์" },
        { href: "/admin/courses", label: "แพ็กเกจ/คอร์ส", active: true },
        { href: "/admin/videos", label: "วิดีโอ" },
      ]}
      actions={
        <ButtonLink href="/admin/courses" size="sm" variant="outline">
          กลับแพ็กเกจ/คอร์ส
        </ButtonLink>
      }
    >
      <Card className="max-w-4xl">
        <h1 className="font-heading text-2xl font-bold text-ink">
          ข้อมูลแพ็กเกจ
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          สร้างแพ็กเกจสำหรับขายใน storefront และเลือกคอร์สที่รวมอยู่
        </p>
        {error ? (
          <p className="mt-5 rounded-card bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        <form
          action={createPackageAction}
          className="mt-6 grid gap-4"
          encType="multipart/form-data"
        >
          <Input label="ชื่อแพ็กเกจ" name="title" required />
          <Input
            hint="ใช้ภาษาอังกฤษ ตัวเลข และขีดกลาง เช่น tcas-bundle"
            label="Slug"
            name="slug"
            required
          />
          <Textarea label="รายละเอียด" name="description" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="ราคา (บาท)" min="0" name="priceThb" required type="number" />
            <Input defaultValue="THB" label="สกุลเงิน" name="currency" required />
          </div>
          <Input
            accept="image/png"
            hint="รองรับเฉพาะไฟล์ PNG ไม่เกิน 5MB"
            label="อัปโหลดรูปปก PNG"
            name="coverImageFile"
            type="file"
          />
          <label className="flex items-center gap-3 text-sm font-bold text-ink">
            <input className="h-4 w-4" name="isPublished" type="checkbox" />
            เผยแพร่แพ็กเกจนี้
          </label>

          <section className="rounded-card border border-line bg-surface-soft p-4">
            <h2 className="font-heading text-lg font-bold text-ink">
              คอร์สในแพ็กเกจ
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {courses.map((course) => (
                <label
                  className="flex items-start gap-3 rounded-card border border-line bg-surface p-3 text-sm"
                  key={course.id}
                >
                  <input
                    className="mt-1 h-4 w-4"
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

          <Button type="submit">สร้างแพ็กเกจ</Button>
        </form>
      </Card>
    </AdminShell>
  );
}
