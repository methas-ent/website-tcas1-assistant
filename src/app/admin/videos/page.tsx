import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { getAdminVideos, formatBytes, formatVideoDate } from "@/lib/admin-video";
import { requireAdmin } from "@/lib/admin";
import {
  getGradeLevelLabel,
  getSubjectCategoryLabel,
} from "@/lib/course-taxonomy";

type AdminVideo = Awaited<ReturnType<typeof getAdminVideos>>[number];

function uniqueText(values: string[]) {
  const filtered = values.filter(Boolean);
  return Array.from(new Set(filtered)).join(", ") || "-";
}

function attachedLessons(video: AdminVideo) {
  return video.lessons.length ? video.lessons : [];
}

function statusVariant(status: string) {
  if (status === "READY") {
    return "success" as const;
  }

  if (status === "FAILED") {
    return "danger" as const;
  }

  return "warning" as const;
}

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams?: { uploaded?: string };
}) {
  await requireAdmin("/admin/videos");

  const videos = await getAdminVideos();

  return (
    <AdminShell
      title="วิดีโอ"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์" },
        { href: "/admin/courses", label: "คอร์ส" },
        { href: "/admin/packages", label: "แพ็กเกจ" },
        { href: "/admin/videos", label: "วิดีโอ", active: true },
      ]}
      actions={
        <ButtonLink href="/admin/videos/upload" size="sm">
          อัปโหลดวิดีโอ
        </ButtonLink>
      }
    >
      <div className="grid gap-5">
        {searchParams?.uploaded ? (
          <p className="rounded-card bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            อัปโหลดวิดีโอและบันทึก metadata แล้ว
          </p>
        ) : null}

        <Table<AdminVideo>
          data={videos}
          emptyTitle="ยังไม่มีวิดีโอ"
          emptyDescription="อัปโหลดวิดีโอสำหรับ development แล้วนำไป attach กับ lesson ในหน้า edit course"
          getRowKey={(video) => video.id}
          columns={[
            {
              key: "title",
              header: "ชื่อวิดีโอ",
              cell: (video) => <p className="font-bold text-ink">{video.title}</p>,
            },
            {
              key: "file",
              header: "ไฟล์",
              cell: (video) => (
                <span className="text-xs text-ink-muted">
                  {video.originalFileName}
                </span>
              ),
            },
            {
              key: "status",
              header: "สถานะ",
              cell: (video) => (
                <Badge variant={statusVariant(video.status)}>
                  {video.status}
                </Badge>
              ),
            },
            {
              key: "size",
              header: "ขนาดไฟล์",
              cell: (video) => <span>{formatBytes(video.sizeBytes)}</span>,
            },
            {
              key: "subject",
              header: "หมวดวิชา",
              cell: (video) => (
                <span>
                  {uniqueText(
                    attachedLessons(video).map(
                      (lesson) =>
                        getSubjectCategoryLabel(
                          lesson.course.subjectCategory,
                          lesson.course.category,
                        ),
                    ),
                  )}
                </span>
              ),
            },
            {
              key: "grade",
              header: "ระดับชั้น",
              cell: (video) => (
                <span>
                  {uniqueText(
                    attachedLessons(video).map(
                      (lesson) =>
                        getGradeLevelLabel(
                          lesson.course.gradeLevel,
                          lesson.course.level,
                        ),
                    ),
                  )}
                </span>
              ),
            },
            {
              key: "course",
              header: "คอร์ส",
              cell: (video) => (
                <span>
                  {uniqueText(
                    attachedLessons(video).map((lesson) => lesson.course.title),
                  )}
                </span>
              ),
            },
            {
              key: "chapter",
              header: "Chapter",
              cell: (video) => (
                <span>
                  {uniqueText(
                    attachedLessons(video).map((lesson) => lesson.chapter.title),
                  )}
                </span>
              ),
            },
            {
              key: "lesson",
              header: "Lesson",
              cell: (video) => (
                <span>
                  {uniqueText(attachedLessons(video).map((lesson) => lesson.title))}
                  {video._count.lessons > 1 ? ` (${video._count.lessons})` : ""}
                </span>
              ),
            },
            {
              key: "created",
              header: "วันที่อัปโหลด",
              cell: (video) => <span>{formatVideoDate(video.createdAt)}</span>,
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
