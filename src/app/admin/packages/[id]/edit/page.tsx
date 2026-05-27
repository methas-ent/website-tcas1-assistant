import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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

        <form
          action={updatePackageAction}
          className="mt-6 grid gap-4"
          encType="multipart/form-data"
        >
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
          {coursePackage.coverImageUrl ? (
            <div className="grid gap-2">
              <p className="text-sm font-bold text-ink-soft">รูปปกปัจจุบัน</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`รูปปกแพ็กเกจ ${coursePackage.title}`}
                className="aspect-video w-full max-w-xl rounded-card border border-line bg-surface-soft object-cover"
                src={coursePackage.coverImageUrl}
              />
            </div>
          ) : null}
          <Input
            accept="image/png"
            hint="เลือกไฟล์ใหม่เพื่อเปลี่ยนรูปปกเดิม รองรับเฉพาะ PNG ไม่เกิน 5MB"
            label="อัปโหลดรูปปก PNG"
            name="coverImageFile"
            type="file"
          />
          <Select
            defaultValue={coursePackage.isPublished ? "PUBLISHED" : "DRAFT"}
            label="สถานะแพ็กเกจ"
            name="status"
            required
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </Select>

          <section className="rounded-card border border-line bg-surface-soft p-4">
            <h2 className="font-heading text-lg font-bold text-ink">
              คอร์สในแพ็กเกจ
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              เลือกคอร์สที่รวมอยู่ในแพ็กเกจนี้ แล้วกดบันทึกได้ทุกครั้งที่ต้องการเพิ่ม/ลดคอร์ส
            </p>
            {coursePackage.items.length ? (
              <div className="mt-4 grid gap-2 rounded-card border border-primary-100 bg-primary-50 p-3">
                {coursePackage.items.map((item, index) => (
                  <div
                    className="flex flex-wrap items-center gap-2 text-sm"
                    key={item.courseId}
                  >
                    <Badge variant="primary">Chapter {index + 1}</Badge>
                    <span className="font-bold text-ink">{item.course.title}</span>
                    <span className="text-xs text-ink-muted">
                      {item.course.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {courses.map((course) => (
                <div
                  className="rounded-card border border-line bg-surface p-3 text-sm"
                  key={course.id}
                >
                  <label className="flex items-start gap-3">
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
                  <div className="mt-3 flex flex-wrap gap-2 pl-7">
                    <ButtonLink
                      href={`/admin/courses/${course.id}/edit`}
                      size="sm"
                      variant="outline"
                    >
                      เพิ่ม Chapter/Lesson
                    </ButtonLink>
                    <ButtonLink href="/admin/videos/upload" size="sm" variant="outline">
                      อัปโหลด VDO
                    </ButtonLink>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-primary-100 bg-primary-50 p-4">
            <h2 className="font-heading text-lg font-bold text-ink">
              เพิ่มเนื้อหาในคอร์ส
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              หลังเลือกคอร์สในแพ็กเกจแล้ว เข้าไปที่ “เพิ่ม Chapter/Lesson” เพื่อสร้าง Chapter ที่ n, คำอธิบาย, lesson และผูก VDO ภายหลังได้
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href="/admin/courses" size="sm" variant="outline">
                กลับไปเพิ่มคอร์สใหม่
              </ButtonLink>
              <ButtonLink href="/admin/videos/upload" size="sm">
                อัปโหลด VDO เข้าคอร์ส
              </ButtonLink>
            </div>
          </section>

          <Button type="submit">บันทึกแพ็กเกจ</Button>
        </form>
      </Card>
    </AdminShell>
  );
}
