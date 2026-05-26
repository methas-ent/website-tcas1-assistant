import { AdminShell } from "@/components/admin/AdminShell";
import { AdminVideoDeleteConfirmForm } from "@/components/admin/AdminVideoDeleteConfirmForm";
import { AdminVideoUploadForm } from "@/components/admin/AdminVideoUploadForm";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import {
  getAdminVideoUploadCatalog,
  getAdminVideos,
  formatBytes,
  formatVideoDate,
} from "@/lib/admin-video";
import {
  deleteVideoAction,
  updateVideoAction,
  uploadVideoAction,
} from "@/lib/admin-video-actions";
import { requireAdmin } from "@/lib/admin";
import {
  getGradeLevelLabel,
  getSubjectCategoryLabel,
} from "@/lib/course-taxonomy";
import { getVideoUploadErrorMessage } from "@/lib/video-storage";

type AdminVideo = Awaited<ReturnType<typeof getAdminVideos>>[number];

type VideoMetadata = {
  subjectCategory?: string | null;
  gradeLevel?: string | null;
  attachedCourseTitle?: string | null;
  selectedCourseTitle?: string | null;
  courseTitle?: string | null;
  attachedChapterTitle?: string | null;
  selectedChapterTitle?: string | null;
  attachedLessonTitle?: string | null;
};

function uniqueText(values: string[]) {
  const filtered = values.filter(Boolean);
  return Array.from(new Set(filtered)).join(", ") || "-";
}

function getVideoMetadata(video: AdminVideo): VideoMetadata {
  if (!video.metadataJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(video.metadataJson) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as VideoMetadata)
      : {};
  } catch {
    return {};
  }
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

function attachmentStatus(video: AdminVideo) {
  if (video._count.lessons > 0) {
    return <Badge variant="success">ผูกกับ lesson แล้ว</Badge>;
  }

  return <Badge variant="warning">รอผูกกับ lesson</Badge>;
}

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams?: { error?: string; saved?: string; uploaded?: string };
}) {
  await requireAdmin("/admin/videos");

  const [videos, courses] = await Promise.all([
    getAdminVideos(),
    getAdminVideoUploadCatalog(),
  ]);
  const error = getVideoUploadErrorMessage(searchParams?.error);

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
        {error ? (
          <p className="rounded-card bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        {searchParams?.uploaded ? (
          <p className="rounded-card bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            อัปโหลดวิดีโอและบันทึก metadata แล้ว
          </p>
        ) : null}
        {searchParams?.saved ? (
          <p className="rounded-card bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            บันทึกข้อมูลวิดีโอแล้ว
          </p>
        ) : null}

        <Card>
          <div className="mb-5">
            <p className="text-sm font-bold text-primary-700">Quick Add</p>
            <h2 className="font-heading text-xl font-bold text-ink">
              อัปโหลด VDO เข้าคอร์ส
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              เลือกหมวดวิชาและชื่อคอร์สก่อนอัปโหลด จะผูกกับ lesson ตอนนี้หรือภายหลังก็ได้
            </p>
          </div>
          <AdminVideoUploadForm
            action={uploadVideoAction}
            courses={courses}
            returnTo="/admin/videos"
          />
        </Card>

        <Table<AdminVideo>
          data={videos}
          emptyTitle="ยังไม่มีวิดีโอ"
          emptyDescription="อัปโหลดวิดีโอสำหรับ development แล้วนำไป attach กับ lesson ในหน้า edit course"
          getRowKey={(video) => video.id}
          columns={[
            {
              key: "title",
              header: "แก้ไขวิดีโอ",
              cell: (video) => (
                <form action={updateVideoAction} className="grid min-w-[240px] gap-2">
                  <input name="videoId" type="hidden" value={video.id} />
                  <Input
                    defaultValue={video.title}
                    label="ชื่อวิดีโอ"
                    name="title"
                    required
                    size="sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Select defaultValue={video.status} name="status" size="sm">
                      <option value="UPLOADED">Uploaded</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="READY">Ready</option>
                      <option value="FAILED">Failed</option>
                    </Select>
                    <Button size="sm" type="submit">
                      Save
                    </Button>
                  </div>
                </form>
              ),
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
                <div className="grid gap-2">
                  <Badge variant={statusVariant(video.status)}>
                    {video.status}
                  </Badge>
                  {attachmentStatus(video)}
                </div>
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
              cell: (video) => {
                const metadata = getVideoMetadata(video);
                const lessonLabels = attachedLessons(video).map((lesson) =>
                  getSubjectCategoryLabel(
                    lesson.course.subjectCategory,
                    lesson.course.category,
                  ),
                );
                const metadataLabel = metadata.subjectCategory
                  ? getSubjectCategoryLabel(metadata.subjectCategory)
                  : "";

                return <span>{uniqueText([...lessonLabels, metadataLabel])}</span>;
              },
            },
            {
              key: "grade",
              header: "ระดับชั้น",
              cell: (video) => {
                const metadata = getVideoMetadata(video);
                const lessonLabels = attachedLessons(video).map((lesson) =>
                  getGradeLevelLabel(
                    lesson.course.gradeLevel,
                    lesson.course.level,
                  ),
                );
                const metadataLabel = metadata.gradeLevel
                  ? getGradeLevelLabel(metadata.gradeLevel)
                  : "";

                return <span>{uniqueText([...lessonLabels, metadataLabel])}</span>;
              },
            },
            {
              key: "course",
              header: "คอร์ส",
              cell: (video) => {
                const metadata = getVideoMetadata(video);

                return (
                  <span>
                    {uniqueText([
                      ...attachedLessons(video).map((lesson) => lesson.course.title),
                      metadata.attachedCourseTitle ??
                        metadata.selectedCourseTitle ??
                        metadata.courseTitle ??
                        "",
                    ])}
                  </span>
                );
              },
            },
            {
              key: "chapter",
              header: "Chapter",
              cell: (video) => {
                const metadata = getVideoMetadata(video);
                const text = uniqueText([
                  ...attachedLessons(video).map((lesson) => lesson.chapter.title),
                  metadata.attachedChapterTitle ??
                    metadata.selectedChapterTitle ??
                    "",
                ]);

                return <span>{text === "-" ? "ยังไม่ผูก" : text}</span>;
              },
            },
            {
              key: "lesson",
              header: "Lesson",
              cell: (video) => {
                const metadata = getVideoMetadata(video);
                const text = uniqueText([
                  ...attachedLessons(video).map((lesson) => lesson.title),
                  metadata.attachedLessonTitle ?? "",
                ]);

                return (
                  <span>
                    {text === "-" ? "รอผูกกับ lesson" : text}
                    {video._count.lessons > 1 ? ` (${video._count.lessons})` : ""}
                  </span>
                );
              },
            },
            {
              key: "created",
              header: "วันที่อัปโหลด",
              cell: (video) => <span>{formatVideoDate(video.createdAt)}</span>,
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
      </div>
    </AdminShell>
  );
}
