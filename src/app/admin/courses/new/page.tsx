import { AdminShell } from "@/components/admin/AdminShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { createCourseAction } from "@/lib/admin-catalog-actions";
import { getAdminCatalogErrorMessage } from "@/lib/admin-catalog";
import { requireAdmin } from "@/lib/admin";
import {
  GRADE_LEVEL_LABELS,
  GRADE_LEVEL_OPTIONS,
  SUBJECT_CATEGORY_LABELS,
  SUBJECT_CATEGORY_OPTIONS,
} from "@/lib/course-taxonomy";

type NewCoursePageProps = {
  searchParams?: {
    error?: string;
  };
};

export default async function NewCoursePage({
  searchParams,
}: NewCoursePageProps) {
  await requireAdmin("/admin/courses/new");
  const error = getAdminCatalogErrorMessage(searchParams?.error);

  return (
    <AdminShell
      title="สร้างคอร์ส"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์" },
        { href: "/admin/courses", label: "คอร์ส", active: true },
        { href: "/admin/packages", label: "แพ็กเกจ" },
      ]}
      actions={
        <ButtonLink href="/admin/courses" size="sm" variant="outline">
          กลับรายการคอร์ส
        </ButtonLink>
      }
    >
      <Card className="max-w-3xl">
        <h1 className="font-heading text-2xl font-bold text-ink">
          ข้อมูลคอร์ส
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          กรอกข้อมูลคอร์สก่อน แล้วค่อยจัด chapter และ lesson ในหน้า edit
        </p>
        {error ? (
          <p className="mt-5 rounded-card bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        <form action={createCourseAction} className="mt-6 grid gap-4">
          <Input label="ชื่อคอร์ส" name="title" required />
          <Input
            hint="ใช้ภาษาอังกฤษ ตัวเลข และขีดกลาง เช่น math-a-level"
            label="Slug"
            name="slug"
            required
          />
          <Input label="คำโปรย" name="subtitle" />
          <Textarea label="รายละเอียด" name="description" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="หมวดวิชา" name="subjectCategory" required>
              {SUBJECT_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SUBJECT_CATEGORY_LABELS[option]}
                </option>
              ))}
            </Select>
            <Select label="ระดับชั้น" name="gradeLevel" required>
              {GRADE_LEVEL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {GRADE_LEVEL_LABELS[option]}
                </option>
              ))}
            </Select>
            <Input label="ระดับคอร์ส/Level" name="level" placeholder="เช่น Foundation" />
          </div>
          <Input label="URL รูปปก" name="coverImageUrl" />
          <Select defaultValue="DRAFT" label="สถานะคอร์ส" name="status" required>
            <option value="DRAFT">Draft</option>
            <option value="READY">Ready</option>
          </Select>
          <Button type="submit">สร้างคอร์ส</Button>
        </form>
      </Card>
    </AdminShell>
  );
}
