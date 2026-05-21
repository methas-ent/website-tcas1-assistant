import { AdminShell } from "@/components/admin/AdminShell";
import { AdminVideoUploadForm } from "@/components/admin/AdminVideoUploadForm";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { uploadVideoAction } from "@/lib/admin-video-actions";
import { requireAdmin } from "@/lib/admin";
import { formatBytes, getAdminVideoUploadCatalog } from "@/lib/admin-video";
import {
  getVideoUploadErrorMessage,
  getVideoUploadMaxBytes,
} from "@/lib/video-storage";

export default async function AdminVideoUploadPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  await requireAdmin("/admin/videos/upload");

  const [courses, error] = await Promise.all([
    getAdminVideoUploadCatalog(),
    Promise.resolve(getVideoUploadErrorMessage(searchParams?.error)),
  ]);

  return (
    <AdminShell
      title="อัปโหลดวิดีโอ"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์" },
        { href: "/admin/courses", label: "คอร์ส" },
        { href: "/admin/packages", label: "แพ็กเกจ" },
        { href: "/admin/videos", label: "วิดีโอ", active: true },
      ]}
      actions={
        <ButtonLink href="/admin/videos" size="sm" variant="outline">
          กลับรายการวิดีโอ
        </ButtonLink>
      }
    >
      <Card className="max-w-3xl">
        <p className="text-sm font-bold text-primary-700">Local dev upload</p>
        <h1 className="mt-2 font-heading text-2xl font-bold text-ink">
          อัปโหลดไฟล์วิดีโอสำหรับ lesson
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          ไฟล์จะถูกเก็บใน local storage folder นอก source code และบันทึกเฉพาะ metadata กับ storage key ลงฐานข้อมูล
        </p>
        <p className="mt-2 text-xs font-semibold text-ink-muted">
          จำกัดขนาดไฟล์ {formatBytes(getVideoUploadMaxBytes())}
        </p>

        {error ? (
          <p className="mt-5 rounded-card bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}

        <AdminVideoUploadForm action={uploadVideoAction} courses={courses} />
      </Card>
    </AdminShell>
  );
}
