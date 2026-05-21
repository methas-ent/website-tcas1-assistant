import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import {
  getAdminCatalogErrorMessage,
  getAdminCourseList,
} from "@/lib/admin-catalog";
import {
  deleteCourseAction,
  quickCreateCourseAction,
  quickUpdateCourseAction,
} from "@/lib/admin-catalog-actions";
import { requireAdmin } from "@/lib/admin";
import {
  GRADE_LEVEL_LABELS,
  GRADE_LEVEL_OPTIONS,
  SUBJECT_CATEGORY_LABELS,
  SUBJECT_CATEGORY_OPTIONS,
  getGradeLevelLabel,
  getSubjectCategoryLabel,
} from "@/lib/course-taxonomy";

type AdminCoursesPageProps = {
  searchParams?: {
    error?: string;
    q?: string;
    saved?: string;
  };
};

type AdminCourse = Awaited<ReturnType<typeof getAdminCourseList>>[number];

export default async function AdminCoursesPage({
  searchParams,
}: AdminCoursesPageProps) {
  await requireAdmin("/admin/courses");

  const query = searchParams?.q ?? "";
  const courses = await getAdminCourseList(query);
  const error = getAdminCatalogErrorMessage(searchParams?.error);

  return (
    <AdminShell
      title="จัดการคอร์ส"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์" },
        { href: "/admin/courses", label: "คอร์ส", active: true },
        { href: "/admin/packages", label: "แพ็กเกจ" },
        { href: "/admin/videos", label: "วิดีโอ" },
      ]}
      actions={<ButtonLink href="/admin/courses/new" size="sm">หน้าเดิม</ButtonLink>}
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
              สร้างคอร์สแบบ Draft ก่อน
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              ตั้งชื่อ เลือกหมวด แล้วค่อยปรับเป็น Ready เมื่อเนื้อหาพร้อม
            </p>
          </div>
          <form
            action={quickCreateCourseAction}
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]"
          >
            <Input label="ชื่อคอร์ส" name="title" required />
            <Select defaultValue="Math" label="หมวด" name="subjectCategory" required>
              {SUBJECT_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SUBJECT_CATEGORY_LABELS[option]}
                </option>
              ))}
            </Select>
            <Select defaultValue="A-Level" label="ระดับ" name="gradeLevel" required>
              {GRADE_LEVEL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {GRADE_LEVEL_LABELS[option]}
                </option>
              ))}
            </Select>
            <div className="flex items-end gap-2">
              <Button
                fullWidth
                name="status"
                type="submit"
                value="DRAFT"
                variant="outline"
              >
                Add Draft
              </Button>
              <Button fullWidth name="status" type="submit" value="READY">
                Add Ready
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <form className="grid gap-3 sm:grid-cols-[1fr_auto]" method="get">
            <Input
              defaultValue={query}
              label="ค้นหาคอร์ส"
              name="q"
              placeholder="ชื่อคอร์ส, slug, หมวดหมู่, ระดับ"
            />
            <div className="flex items-end gap-2">
              <Button type="submit">ค้นหา</Button>
              <ButtonLink href="/admin/courses" variant="outline">
                ล้าง
              </ButtonLink>
            </div>
          </form>
        </Card>

        <Table<AdminCourse>
          data={courses}
          emptyTitle="ยังไม่มีคอร์ส"
          emptyDescription="สร้างคอร์สแรกเพื่อเริ่มจัด chapter และ lesson"
          getRowKey={(course) => course.id}
          columns={[
            {
              key: "title",
              header: "แก้ไขคอร์ส",
              cell: (course) => (
                <form
                  action={quickUpdateCourseAction}
                  className="grid min-w-[260px] gap-2"
                >
                  <input name="courseId" type="hidden" value={course.id} />
                  <Input
                    defaultValue={course.title}
                    label="ชื่อคอร์ส"
                    name="title"
                    required
                    size="sm"
                  />
                  <p className="mt-1 text-xs text-ink-muted">{course.slug}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select
                      defaultValue={course.subjectCategory || course.category || "Other"}
                      name="subjectCategory"
                      size="sm"
                    >
                      {SUBJECT_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {SUBJECT_CATEGORY_LABELS[option]}
                        </option>
                      ))}
                    </Select>
                    <Select
                      defaultValue={course.gradeLevel || course.level || "Other"}
                      name="gradeLevel"
                      size="sm"
                    >
                      {GRADE_LEVEL_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {GRADE_LEVEL_LABELS[option]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      name="status"
                      size="sm"
                      type="submit"
                      value="DRAFT"
                      variant={course.isPublished ? "outline" : "secondary"}
                    >
                      บันทึก Draft
                    </Button>
                    <Button
                      name="status"
                      size="sm"
                      type="submit"
                      value="READY"
                      variant={course.isPublished ? "success" : "primary"}
                    >
                      บันทึก Ready
                    </Button>
                  </div>
                </form>
              ),
            },
            {
              key: "meta",
              header: "หมวดหมู่",
              cell: (course) => (
                <div>
                  <p className="font-semibold text-ink">
                    {getSubjectCategoryLabel(
                      course.subjectCategory,
                      course.category || course.subject,
                    )}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {getGradeLevelLabel(course.gradeLevel, course.level)}
                  </p>
                  {course.level && course.level !== course.gradeLevel ? (
                    <p className="text-xs text-ink-muted">{course.level}</p>
                  ) : null}
                </div>
              ),
            },
            {
              key: "content",
              header: "เนื้อหา",
              cell: (course) => (
                <span>
                  {course._count.chapters} chapters · {course._count.lessons} lessons
                </span>
              ),
            },
            {
              key: "packages",
              header: "แพ็กเกจ",
              cell: (course) => <span>{course._count.packageItems}</span>,
            },
            {
              key: "status",
              header: "สถานะ",
              cell: (course) => (
                <Badge variant={course.isPublished ? "success" : "neutral"}>
                  {course.isPublished ? "Ready" : "Draft"}
                </Badge>
              ),
            },
            {
              key: "action",
              header: "จัดการ",
              align: "right",
              cell: (course) => (
                <div className="flex flex-wrap justify-end gap-2">
                  <ButtonLink
                    href={`/admin/courses/${course.id}/edit`}
                    size="sm"
                    variant="outline"
                  >
                    รายละเอียด
                  </ButtonLink>
                  <form action={deleteCourseAction}>
                    <input name="courseId" type="hidden" value={course.id} />
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
