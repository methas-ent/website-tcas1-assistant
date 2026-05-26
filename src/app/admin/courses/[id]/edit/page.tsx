import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  createChapterAction,
  createLessonAction,
  updateChapterAction,
  updateCourseAction,
  updateLessonAction,
} from "@/lib/admin-catalog-actions";
import {
  getAdminCatalogErrorMessage,
  getAdminCourseEdit,
  getAdminVideoAssets,
} from "@/lib/admin-catalog";
import { requireAdmin } from "@/lib/admin";
import {
  GRADE_LEVEL_LABELS,
  GRADE_LEVEL_OPTIONS,
  SUBJECT_CATEGORY_LABELS,
  SUBJECT_CATEGORY_OPTIONS,
  normalizeGradeLevel,
  normalizeSubjectCategory,
} from "@/lib/course-taxonomy";

type EditCoursePageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    error?: string;
    saved?: string;
  };
};

function checkboxLabel(name: string, label: string, defaultChecked?: boolean) {
  return (
    <label className="flex items-center gap-3 text-sm font-bold text-ink">
      <input
        className="h-4 w-4"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
      {label}
    </label>
  );
}

export default async function EditCoursePage({
  params,
  searchParams,
}: EditCoursePageProps) {
  await requireAdmin(`/admin/courses/${params.id}/edit`);

  const [course, videoAssets] = await Promise.all([
    getAdminCourseEdit(params.id),
    getAdminVideoAssets(),
  ]);

  if (!course) {
    notFound();
  }

  const error = getAdminCatalogErrorMessage(searchParams?.error);

  return (
    <AdminShell
      title="แก้ไขคอร์ส"
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary-700">คอร์ส</p>
              <h1 className="font-heading text-2xl font-bold text-ink">
                {course.title}
              </h1>
              <p className="mt-1 text-sm text-ink-muted">{course.slug}</p>
            </div>
            <Badge variant={course.isPublished ? "success" : "neutral"} size="md">
              {course.isPublished ? "Ready" : "Draft"}
            </Badge>
          </div>

          <form
            action={updateCourseAction}
            className="mt-6 grid gap-4"
            encType="multipart/form-data"
          >
            <input name="courseId" type="hidden" value={course.id} />
            <Input defaultValue={course.title} label="ชื่อคอร์ส" name="title" required />
            <Input defaultValue={course.slug} label="Slug" name="slug" required />
            <Input defaultValue={course.subtitle} label="คำโปรย" name="subtitle" />
            <Textarea
              defaultValue={course.description}
              label="รายละเอียด"
              name="description"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                defaultValue={normalizeSubjectCategory(
                  course.subjectCategory,
                  course.category || course.subject,
                )}
                label="หมวดวิชา"
                name="subjectCategory"
                required
              >
                {SUBJECT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {SUBJECT_CATEGORY_LABELS[option]}
                  </option>
                ))}
              </Select>
              <Select
                defaultValue={normalizeGradeLevel(course.gradeLevel, course.level)}
                label="ระดับชั้น"
                name="gradeLevel"
                required
              >
                {GRADE_LEVEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {GRADE_LEVEL_LABELS[option]}
                  </option>
                ))}
              </Select>
              <Input defaultValue={course.level} label="ระดับคอร์ส/Level" name="level" />
            </div>
            {course.coverImageUrl ? (
              <div className="grid gap-2">
                <p className="text-sm font-bold text-ink-soft">รูปปกปัจจุบัน</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`รูปปกคอร์ส ${course.title}`}
                  className="aspect-video w-full max-w-xl rounded-card border border-line bg-surface-soft object-cover"
                  src={course.coverImageUrl}
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
              defaultValue={course.isPublished ? "READY" : "DRAFT"}
              label="สถานะคอร์ส"
              name="status"
              required
            >
              <option value="DRAFT">Draft</option>
              <option value="READY">Ready</option>
            </Select>
            <Button type="submit">บันทึกคอร์ส</Button>
          </form>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-bold text-ink">
            เพิ่ม Chapter
          </h2>
          <form
            action={createChapterAction}
            className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_120px_auto]"
          >
            <input name="courseId" type="hidden" value={course.id} />
            <Input label="ชื่อ chapter" name="title" required />
            <Input label="Description" name="description" />
            <Input defaultValue={course.chapters.length + 1} label="Sort" name="sortOrder" type="number" />
            <div className="flex items-end gap-3">
              {checkboxLabel("isPublished", "Published", true)}
              <Button type="submit">เพิ่ม</Button>
            </div>
          </form>
        </Card>

        <section className="grid gap-5">
          {course.chapters.map((chapter) => (
            <Card key={chapter.id}>
              <form action={updateChapterAction} className="grid gap-4">
                <input name="courseId" type="hidden" value={course.id} />
                <input name="chapterId" type="hidden" value={chapter.id} />
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr_120px_auto]">
                  <Input
                    defaultValue={chapter.title}
                    label="Chapter title"
                    name="title"
                    required
                  />
                  <Input
                    defaultValue={chapter.description ?? ""}
                    label="Description"
                    name="description"
                  />
                  <Input
                    defaultValue={chapter.sortOrder}
                    label="Sort"
                    name="sortOrder"
                    type="number"
                  />
                  <div className="flex items-end gap-3">
                    {checkboxLabel(
                      "isPublished",
                      "Published",
                      chapter.isPublished,
                    )}
                    <Button type="submit" variant="outline">
                      บันทึก
                    </Button>
                  </div>
                </div>
              </form>

              <div className="mt-6 border-t border-line pt-5">
                <h3 className="font-heading text-lg font-bold text-ink">
                  Lessons
                </h3>
                <form
                  action={createLessonAction}
                  className="mt-4 grid gap-4 xl:grid-cols-[1fr_120px_150px_1fr_auto]"
                >
                  <input name="courseId" type="hidden" value={course.id} />
                  <input name="chapterId" type="hidden" value={chapter.id} />
                  <Input label="Lesson title" name="title" required />
                  <Input
                    defaultValue={chapter.lessons.length + 1}
                    label="Sort"
                    name="sortOrder"
                    type="number"
                  />
                  <Input
                    label="Duration sec"
                    name="durationSeconds"
                    type="number"
                  />
                  <Select label="Video asset" name="videoAssetId">
                    <option value="">ยังไม่เลือกวิดีโอ</option>
                    {videoAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.title} ({asset.status})
                      </option>
                    ))}
                  </Select>
                  <div className="flex flex-col justify-end gap-2">
                    {checkboxLabel("isPreview", "Preview")}
                    {checkboxLabel("isPublished", "Published")}
                    <Button type="submit">เพิ่ม lesson</Button>
                  </div>
                  <Textarea
                    className="xl:col-span-5"
                    label="Lesson description"
                    name="description"
                  />
                </form>

                <div className="mt-5 grid gap-3">
                  {chapter.lessons.map((lesson) => (
                    <form
                      action={updateLessonAction}
                      className="rounded-card border border-line bg-surface-soft p-4"
                      key={lesson.id}
                    >
                      <input name="courseId" type="hidden" value={course.id} />
                      <input name="lessonId" type="hidden" value={lesson.id} />
                      <div className="grid gap-4 xl:grid-cols-[1fr_110px_140px_1fr_auto]">
                        <Input
                          defaultValue={lesson.title}
                          label="Lesson title"
                          name="title"
                          required
                        />
                        <Input
                          defaultValue={lesson.sortOrder}
                          label="Sort"
                          name="sortOrder"
                          type="number"
                        />
                        <Input
                          defaultValue={lesson.durationSeconds ?? ""}
                          label="Duration sec"
                          name="durationSeconds"
                          type="number"
                        />
                        <Select
                          defaultValue={lesson.videoAssetId ?? ""}
                          label="Video asset"
                          name="videoAssetId"
                        >
                          <option value="">ยังไม่เลือกวิดีโอ</option>
                          {videoAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.title} ({asset.status})
                            </option>
                          ))}
                        </Select>
                        <div className="flex flex-col justify-end gap-2">
                          {checkboxLabel("isPreview", "Preview", lesson.isPreview)}
                          {checkboxLabel(
                            "isPublished",
                            "Published",
                            lesson.isPublished,
                          )}
                          <Button type="submit" variant="outline">
                            Save
                          </Button>
                        </div>
                        <Textarea
                          className="xl:col-span-5"
                          defaultValue={lesson.description ?? ""}
                          label="Lesson description"
                          name="description"
                        />
                      </div>
                    </form>
                  ))}
                  {!chapter.lessons.length ? (
                    <p className="rounded-card border border-dashed border-line p-4 text-center text-sm text-ink-muted">
                      ยังไม่มี lesson ใน chapter นี้
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
          {!course.chapters.length ? (
            <Card className="text-center text-sm text-ink-muted">
              ยังไม่มี chapter
            </Card>
          ) : null}
        </section>
      </div>
    </AdminShell>
  );
}
