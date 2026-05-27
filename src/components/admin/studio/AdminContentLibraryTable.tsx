import { AdminDeleteConfirmForm } from "@/components/admin/AdminDeleteConfirmForm";
import { AdminVideoDeleteConfirmForm } from "@/components/admin/AdminVideoDeleteConfirmForm";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { cn } from "@/components/ui/cn";
import {
  getAdminCourseList,
  getAdminPackageList,
} from "@/lib/admin-catalog";
import {
  deleteCourseAction,
  deletePackageAction,
} from "@/lib/admin-catalog-actions";
import { getAdminVideos, formatBytes, formatVideoDate } from "@/lib/admin-video";
import { deleteVideoAction } from "@/lib/admin-video-actions";
import {
  getGradeLevelLabel,
  getSubjectCategoryLabel,
} from "@/lib/course-taxonomy";
import { formatPrice } from "@/lib/storefront";

type AdminCourse = Awaited<ReturnType<typeof getAdminCourseList>>[number];
type AdminPackage = Awaited<ReturnType<typeof getAdminPackageList>>[number];
type AdminVideo = Awaited<ReturnType<typeof getAdminVideos>>[number];

type LibraryTab = "all" | "courses" | "packages" | "videos";

type AdminContentLibraryTableProps = {
  searchParams?: { tab?: string };
};

const tabs: Array<{ value: LibraryTab; label: string }> = [
  { value: "all", label: "ทั้งหมด" },
  { value: "courses", label: "คอร์ส" },
  { value: "packages", label: "แพ็คเกจ" },
  { value: "videos", label: "วิดีโอ" },
];

function normalizeTab(value: string | undefined): LibraryTab {
  if (value === "courses" || value === "packages" || value === "videos") {
    return value;
  }
  return "all";
}

function videoStatusVariant(status: string) {
  if (status === "READY") return "success" as const;
  if (status === "FAILED") return "danger" as const;
  return "warning" as const;
}

export async function AdminContentLibraryTable({
  searchParams,
}: AdminContentLibraryTableProps) {
  const activeTab = normalizeTab(searchParams?.tab);
  const [courses, packages, videos] = await Promise.all([
    getAdminCourseList(),
    getAdminPackageList(),
    getAdminVideos(),
  ]);

  const showCourses = activeTab === "all" || activeTab === "courses";
  const showPackages = activeTab === "all" || activeTab === "packages";
  const showVideos = activeTab === "all" || activeTab === "videos";

  return (
    <Card className="grid gap-5" padding="lg">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-primary-700">คลังเนื้อหา</p>
          <h2 className="font-heading text-xl font-bold text-ink">
            รายการคอร์ส แพ็คเกจ และวิดีโอ
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            กรองด้วยแท็บด้านล่าง หรือเปิดหน้า edit เพื่อแก้ไขรายละเอียดเพิ่มเติม
          </p>
        </div>
      </header>

      <nav
        aria-label="กรองรายการในคลังเนื้อหา"
        className="flex flex-wrap gap-2"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === activeTab;
          const href =
            tab.value === "all"
              ? "/admin/videos"
              : `/admin/videos?tab=${tab.value}`;

          return (
            <ButtonLink
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-full",
                isActive ? "" : "hover:border-primary-200",
              )}
              href={href}
              key={tab.value}
              size="sm"
              variant={isActive ? "primary" : "outline"}
            >
              {tab.label}
            </ButtonLink>
          );
        })}
      </nav>

      {showCourses ? (
        <section className="grid gap-3">
          <h3 className="font-heading text-lg font-bold text-ink">
            คอร์ส ({courses.length})
          </h3>
          <Table<AdminCourse>
            data={courses}
            emptyTitle="ยังไม่มีคอร์ส"
            emptyDescription="ใช้วิซาร์ดด้านบนสร้างคอร์สแรก"
            getRowKey={(course) => course.id}
            columns={[
              {
                key: "title",
                header: "คอร์ส",
                cell: (course) => (
                  <div className="min-w-[200px]">
                    <p className="font-bold text-ink">{course.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">{course.slug}</p>
                  </div>
                ),
              },
              {
                key: "type",
                header: "ประเภท",
                cell: () => <Badge variant="primary">Course</Badge>,
              },
              {
                key: "subject",
                header: "หมวดวิชา",
                cell: (course) => (
                  <span>
                    {getSubjectCategoryLabel(
                      course.subjectCategory,
                      course.category || course.subject,
                    )}
                  </span>
                ),
              },
              {
                key: "grade",
                header: "ระดับชั้น",
                cell: (course) => (
                  <span>
                    {getGradeLevelLabel(course.gradeLevel, course.level)}
                  </span>
                ),
              },
              {
                key: "price",
                header: "ราคา",
                cell: (course) => (
                  <span className="font-bold text-primary-700">
                    {formatPrice(course.priceCents, course.currency)}
                  </span>
                ),
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
                header: "จัดการ",
                align: "right",
                cell: (course) => (
                  <div className="flex flex-wrap justify-end gap-2">
                    <ButtonLink
                      href={`/admin/courses/${course.id}/edit`}
                      size="sm"
                      variant="outline"
                    >
                      แก้ไข
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
        </section>
      ) : null}

      {showPackages ? (
        <section className="grid gap-3">
          <h3 className="font-heading text-lg font-bold text-ink">
            แพ็คเกจ ({packages.length})
          </h3>
          <Table<AdminPackage>
            data={packages}
            emptyTitle="ยังไม่มีแพ็คเกจ"
            emptyDescription="ใช้วิซาร์ดด้านบนสร้างแพ็คเกจ"
            getRowKey={(coursePackage) => coursePackage.id}
            columns={[
              {
                key: "title",
                header: "แพ็คเกจ",
                cell: (coursePackage) => (
                  <div className="min-w-[200px]">
                    <p className="font-bold text-ink">{coursePackage.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {coursePackage.slug}
                    </p>
                  </div>
                ),
              },
              {
                key: "type",
                header: "ประเภท",
                cell: () => <Badge variant="accent">Package</Badge>,
              },
              {
                key: "courses",
                header: "คอร์สในแพ็คเกจ",
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
                key: "price",
                header: "ราคา",
                cell: (coursePackage) => (
                  <span className="font-bold text-primary-700">
                    {formatPrice(
                      coursePackage.priceCents,
                      coursePackage.currency,
                    )}
                  </span>
                ),
              },
              {
                key: "status",
                header: "สถานะ",
                cell: (coursePackage) => (
                  <Badge
                    variant={coursePackage.isPublished ? "success" : "neutral"}
                  >
                    {coursePackage.isPublished ? "Published" : "Draft"}
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
                      แก้ไข
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
        </section>
      ) : null}

      {showVideos ? (
        <section className="grid gap-3">
          <h3 className="font-heading text-lg font-bold text-ink">
            วิดีโอ ({videos.length})
          </h3>
          <Table<AdminVideo>
            data={videos}
            emptyTitle="ยังไม่มีวิดีโอ"
            emptyDescription="อัปโหลด VDO ใหม่ผ่านวิซาร์ดด้านบน"
            getRowKey={(video) => video.id}
            columns={[
              {
                key: "title",
                header: "วิดีโอ",
                cell: (video) => (
                  <div className="min-w-[200px]">
                    <p className="font-bold text-ink">{video.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {video.originalFileName}
                    </p>
                  </div>
                ),
              },
              {
                key: "type",
                header: "ประเภท",
                cell: () => <Badge variant="neutral">Video</Badge>,
              },
              {
                key: "size",
                header: "ขนาดไฟล์",
                cell: (video) => <span>{formatBytes(video.sizeBytes)}</span>,
              },
              {
                key: "status",
                header: "สถานะ",
                cell: (video) => (
                  <Badge variant={videoStatusVariant(video.status)}>
                    {video.status}
                  </Badge>
                ),
              },
              {
                key: "lessons",
                header: "ผูกกับ Lesson",
                cell: (video) =>
                  video._count.lessons > 0 ? (
                    <Badge variant="success">
                      {video._count.lessons} lesson
                    </Badge>
                  ) : (
                    <Badge variant="warning">รอผูก</Badge>
                  ),
              },
              {
                key: "created",
                header: "วันที่อัปโหลด",
                cell: (video) => (
                  <span className="text-xs text-ink-muted">
                    {formatVideoDate(video.createdAt)}
                  </span>
                ),
              },
              {
                key: "action",
                header: "จัดการ",
                align: "right",
                cell: (video) => (
                  <AdminVideoDeleteConfirmForm
                    action={deleteVideoAction}
                    videoId={video.id}
                    videoTitle={video.title}
                  />
                ),
              },
            ]}
          />
        </section>
      ) : null}
    </Card>
  );
}
