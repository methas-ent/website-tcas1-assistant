import { AdminShell } from "@/components/admin/AdminShell";
import { AdminContentLibraryTable } from "@/components/admin/studio/AdminContentLibraryTable";
import { AdminStudioWizard } from "@/components/admin/studio/AdminStudioWizard";
import { Card } from "@/components/ui/Card";
import { formatBytes } from "@/lib/admin-video";
import { requireAdmin } from "@/lib/admin";
import { getAdminCatalogErrorMessage } from "@/lib/admin-catalog";
import { createStudioContentAction } from "@/lib/admin-catalog-actions";
import {
  getVideoUploadErrorMessage,
  getVideoUploadMaxBytes,
} from "@/lib/video-storage";

type AdminVideosPageProps = {
  searchParams?: {
    error?: string;
    saved?: string;
    tab?: string;
  };
};

export default async function AdminVideosPage({
  searchParams,
}: AdminVideosPageProps) {
  await requireAdmin("/admin/videos");

  const maxVideoBytes = getVideoUploadMaxBytes();
  const error =
    getAdminCatalogErrorMessage(searchParams?.error) ??
    getVideoUploadErrorMessage(searchParams?.error);

  return (
    <AdminShell title="อัปโหลด VDO และจัดการเนื้อหา">
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

        <Card
          className="bg-gradient-to-br from-primary-50 to-surface"
          padding="lg"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-sm font-bold text-primary-700">
                Admin content studio
              </p>
              <h1 className="mt-2 font-heading text-2xl font-bold text-ink">
                อัปโหลด VDO และจัดการคอร์ส/แพ็คเกจ
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
                สร้างคอร์สหรือแพ็คเกจใหม่แบบ 3 ขั้นตอน
                ระบบจะเก็บไฟล์วิดีโอผ่าน local/dev storage
                และผูกวิดีโอเข้ากับ lesson แรกอัตโนมัติ
              </p>
            </div>
            <div className="grid gap-1 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-sm">
              <span className="font-bold text-ink">ขนาดสูงสุด</span>
              <span className="text-primary-700">
                VDO ไม่เกิน {formatBytes(maxVideoBytes)}
              </span>
              <span className="text-xs text-ink-muted">
                รูปปกรองรับเฉพาะ PNG
              </span>
            </div>
          </div>
        </Card>

        <AdminStudioWizard
          action={createStudioContentAction}
          maxVideoBytes={maxVideoBytes}
        />

        <AdminContentLibraryTable searchParams={searchParams} />
      </div>
    </AdminShell>
  );
}
