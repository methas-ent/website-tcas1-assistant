import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { getAdminCourseList } from "@/lib/admin-catalog";
import { requireAdmin } from "@/lib/admin";
import {
  getGradeLevelLabel,
  getSubjectCategoryLabel,
} from "@/lib/course-taxonomy";

type AdminCoursesPageProps = {
  searchParams?: {
    q?: string;
  };
};

type AdminCourse = Awaited<ReturnType<typeof getAdminCourseList>>[number];

export default async function AdminCoursesPage({
  searchParams,
}: AdminCoursesPageProps) {
  await requireAdmin("/admin/courses");

  const query = searchParams?.q ?? "";
  const courses = await getAdminCourseList(query);

  return (
    <AdminShell
      title="จัดการคอร์ส"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์" },
        { href: "/admin/courses", label: "คอร์ส", active: true },
        { href: "/admin/packages", label: "แพ็กเกจ" },
      ]}
      actions={
        <ButtonLink href="/admin/courses/new" size="sm">
          สร้างคอร์ส
        </ButtonLink>
      }
    >
      <div className="grid gap-6">
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
              header: "คอร์ส",
              cell: (course) => (
                <div>
                  <Link
                    className="font-bold text-primary-700 hover:text-primary-600"
                    href={`/admin/courses/${course.id}/edit`}
                  >
                    {course.title}
                  </Link>
                  <p className="mt-1 text-xs text-ink-muted">{course.slug}</p>
                </div>
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
                  {course.isPublished ? "Published" : "Draft"}
                </Badge>
              ),
            },
            {
              key: "action",
              header: "แก้ไข",
              align: "right",
              cell: (course) => (
                <ButtonLink
                  href={`/admin/courses/${course.id}/edit`}
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
