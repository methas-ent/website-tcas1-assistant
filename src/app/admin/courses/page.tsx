import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDeleteConfirmForm } from "@/components/admin/AdminDeleteConfirmForm";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import {
  getAdminCatalogErrorMessage,
  getAdminCourseList,
  getAdminPackageList,
} from "@/lib/admin-catalog";
import {
  createPackageCourseBundleAction,
  deleteCourseAction,
  deletePackageAction,
  quickCreateCourseAction,
  quickUpdateCourseAction,
} from "@/lib/admin-catalog-actions";
import { requireAdmin } from "@/lib/admin";
import { formatPrice } from "@/lib/storefront";
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
type AdminPackage = Awaited<ReturnType<typeof getAdminPackageList>>[number];

export default async function AdminCoursesPage({
  searchParams,
}: AdminCoursesPageProps) {
  await requireAdmin("/admin/courses");

  const query = searchParams?.q ?? "";
  const [courses, packages] = await Promise.all([
    getAdminCourseList(query),
    getAdminPackageList(query),
  ]);
  const error = getAdminCatalogErrorMessage(searchParams?.error);

  return (
    <AdminShell
      title="จัดการแพ็กเกจ/คอร์ส"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์" },
        { href: "/admin/courses", label: "แพ็กเกจ/คอร์ส", active: true },
        { href: "/admin/videos", label: "วิดีโอ" },
      ]}
      actions={
        <>
          <ButtonLink href="/admin/courses/new" size="sm" variant="outline">
            เพิ่มคอร์สละเอียด
          </ButtonLink>
          <ButtonLink href="/admin/packages/new" size="sm" variant="outline">
            เพิ่มแพ็กเกจละเอียด
          </ButtonLink>
        </>
      }
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
            <p className="text-sm font-bold text-primary-700">Package Builder</p>
            <h2 className="font-heading text-xl font-bold text-ink">
              สร้างแพ็กเกจพร้อมคอร์สแรก
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              ตัวอย่าง: สร้างแพ็กเกจ Bio-Alevel พร้อมคอร์สแรกและ Chapter 1 ก่อน แล้วค่อยเพิ่ม chapter, lesson และ VDO ภายหลังได้ตลอด
            </p>
          </div>
          <form
            action={createPackageCourseBundleAction}
            className="grid gap-4"
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_150px]">
              <Input
                label="ชื่อแพ็กเกจ"
                name="packageTitle"
                placeholder="เช่น Bio-Alevel"
                required
              />
              <Input
                label="ชื่อคอร์สแรก"
                name="courseTitle"
                placeholder="เช่น Biology A-Level Intensive"
              />
              <Input
                defaultValue="0"
                label="ราคา (บาท)"
                min="0"
                name="priceThb"
                required
                type="number"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[180px_180px_120px_minmax(220px,1fr)]">
              <Select defaultValue="Biology" label="วิชา" name="subjectCategory" required>
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
              <Input
                defaultValue="1"
                label="Chapter ที่"
                min="0"
                name="chapterSortOrder"
                type="number"
              />
              <Input
                label="ชื่อ Chapter แรก"
                name="chapterTitle"
                placeholder="เช่น บทนำชีววิทยา"
              />
            </div>
            <Input
              label="คำอธิบาย/เนื้อหาย่อยในคอร์ส"
              name="chapterDescription"
              placeholder="รายละเอียดหัวข้อย่อย หรือสิ่งที่จะเรียนใน chapter นี้"
            />
            <input name="currency" type="hidden" value="THB" />
            <div className="flex flex-wrap gap-2">
              <Button name="status" type="submit" value="DRAFT" variant="outline">
                สร้าง Draft แล้วไปเพิ่มเนื้อหา
              </Button>
              <Button name="status" type="submit" value="READY" variant="success">
                สร้างแบบ Ready
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <div className="mb-5">
            <p className="text-sm font-bold text-primary-700">Quick Add</p>
            <h2 className="font-heading text-xl font-bold text-ink">
              เพิ่มคอร์สเดี่ยว
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              ใช้เมื่อมีแพ็กเกจอยู่แล้ว และต้องการเพิ่มคอร์สเข้าไปภายหลัง
            </p>
          </div>
          <form
            action={quickCreateCourseAction}
            className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(150px,180px)_minmax(150px,180px)_minmax(150px,170px)] xl:items-end"
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
            <div className="grid grid-cols-2 gap-2">
              <Button
                fullWidth
                name="status"
                size="sm"
                type="submit"
                value="DRAFT"
                variant="outline"
              >
                Draft
              </Button>
              <Button fullWidth name="status" size="sm" type="submit" value="READY">
                Ready
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <form className="grid gap-3 sm:grid-cols-[1fr_auto]" method="get">
            <Input
              defaultValue={query}
              label="ค้นหาแพ็กเกจ/คอร์ส"
              name="q"
              placeholder="ชื่อแพ็กเกจ, ชื่อคอร์ส, slug, หมวดหมู่, ระดับ"
            />
            <div className="flex items-end gap-2">
              <Button type="submit">ค้นหา</Button>
              <ButtonLink href="/admin/courses" variant="outline">
                ล้าง
              </ButtonLink>
            </div>
          </form>
        </Card>

        <Table<AdminPackage>
          data={packages}
          emptyTitle="ยังไม่มีแพ็กเกจ"
          emptyDescription="สร้างแพ็กเกจพร้อมคอร์สแรกจากฟอร์มด้านบน"
          getRowKey={(coursePackage) => coursePackage.id}
          columns={[
            {
              key: "title",
              header: "แพ็กเกจ",
              cell: (coursePackage) => (
                <div className="min-w-[220px]">
                  <p className="font-bold text-ink">{coursePackage.title}</p>
                  <p className="mt-1 text-xs text-ink-muted">{coursePackage.slug}</p>
                  <p className="mt-2 text-sm font-bold text-primary-700">
                    {formatPrice(coursePackage.priceCents, coursePackage.currency)}
                  </p>
                </div>
              ),
            },
            {
              key: "courses",
              header: "คอร์สในแพ็กเกจ",
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
                    แก้แพ็กเกจ/เลือกคอร์ส
                  </ButtonLink>
                  <AdminDeleteConfirmForm
                    action={deletePackageAction}
                    hiddenFieldName="packageId"
                    hiddenFieldValue={coursePackage.id}
                    itemTitle={coursePackage.title}
                  />
                </div>
              ),
            },
          ]}
        />

        <Table<AdminCourse>
          data={courses}
          emptyTitle="ยังไม่มีคอร์ส"
          emptyDescription="สร้างแพ็กเกจพร้อมคอร์สแรก หรือเพิ่มคอร์สเดี่ยวเพื่อเริ่มจัด chapter และ lesson"
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
                      Draft
                    </Button>
                    <Button
                      name="status"
                      size="sm"
                      type="submit"
                      value="READY"
                      variant={course.isPublished ? "success" : "primary"}
                    >
                      Ready
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
                    เพิ่มเนื้อหา/Chapter/VDO
                  </ButtonLink>
                  <ButtonLink
                    href="/admin/videos/upload"
                    size="sm"
                    variant="outline"
                  >
                    อัปโหลด VDO
                  </ButtonLink>
                  <AdminDeleteConfirmForm
                    action={deleteCourseAction}
                    hiddenFieldName="courseId"
                    hiddenFieldValue={course.id}
                    itemTitle={course.title}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
