import { notFound } from "next/navigation";
import { AdminDeleteConfirmForm } from "@/components/admin/AdminDeleteConfirmForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  createChapterAction,
  createLessonAction,
  deleteCourseAction,
  updateChapterAction,
  updateCourseAction,
  updateLessonAction,
} from "@/lib/admin-catalog-actions";
import {
  formatThaiBahtFromCents,
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
  TEACHER_OPTIONS,
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

type CheckboxLabelProps = {
  name: string;
  label: string;
  defaultChecked?: boolean;
  compact?: boolean;
};

function checkboxLabel({
  name,
  label,
  defaultChecked,
  compact,
}: CheckboxLabelProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-bold text-ink">
      <input
        className="h-4 w-4 rounded border-line text-primary"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
      <span className={compact ? "text-xs" : undefined}>{label}</span>
    </label>
  );
}

function statusBadge(isPublished: boolean) {
  return (
    <Badge variant={isPublished ? "success" : "warning"} size="md">
      {isPublished ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
    </Badge>
  );
}

function statCard(label: string, value: string | number, hint?: string) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </p>
      <p className="mt-2 font-heading text-2xl font-bold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
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
  const chapterCount = course.chapters.length;
  const lessonCount = course.chapters.reduce(
    (total, chapter) => total + chapter.lessons.length,
    0,
  );
  const readyVideoCount = course.chapters.reduce(
    (total, chapter) =>
      total +
      chapter.lessons.filter((lesson) => lesson.videoAsset?.status === "READY")
        .length,
    0,
  );

  return (
    <AdminShell
      title="จัดการคอร์ส"
      navItems={[
        { href: "/admin", label: "แดชบอร์ด" },
        { href: "/admin/orders", label: "ออเดอร์" },
        { href: "/admin/courses", label: "แพ็กเกจ/คอร์ส", active: true },
        { href: "/admin/videos", label: "วิดีโอ" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/courses" size="sm" variant="outline">
            กลับรายการ
          </ButtonLink>
          <ButtonLink href="/admin/videos/upload" size="sm">
            อัปโหลด VDO
          </ButtonLink>
        </div>
      }
    >
      <div className="grid gap-5">
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

        <Card className="bg-gradient-to-br from-primary-50 to-surface">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-700">
                Course Studio
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="min-w-0 font-heading text-2xl font-bold text-ink">
                  {course.title}
                </h1>
                {statusBadge(course.isPublished)}
              </div>
              <p className="mt-2 text-sm text-ink-muted">
                {course.slug} · {course.teacherName || "ยังไม่ได้ระบุครูผู้สอน"}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">
                จัดข้อมูลคอร์ส เพิ่ม Chapter และผูก VDO กับ Lesson จากหน้านี้
                เปิดเฉพาะ Chapter ที่ต้องแก้เพื่อให้ทำงานง่ายขึ้น
              </p>
            </div>
            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
              <AdminDeleteConfirmForm
                action={deleteCourseAction}
                hiddenFieldName="courseId"
                hiddenFieldValue={course.id}
                itemTitle={course.title}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCard("ราคา", `${formatThaiBahtFromCents(course.priceCents)} บาท`)}
            {statCard("Chapter", chapterCount)}
            {statCard("บทเรียน", lessonCount)}
            {statCard("VDO พร้อมใช้", readyVideoCount, `${videoAssets.length} ไฟล์`)}
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card>
            <CardHeader>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-700">
                1. Course Details
              </p>
              <CardTitle>ข้อมูลหลักของคอร์ส</CardTitle>
              <CardDescription>
                แก้เฉพาะข้อมูลที่แสดงใน catalog และหน้าคอร์ส ไม่จำเป็นต้องแตะ Chapter ถ้าไม่ได้เปลี่ยนเนื้อหา
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={updateCourseAction}
                className="grid gap-4"
                encType="multipart/form-data"
              >
                <input name="courseId" type="hidden" value={course.id} />
                <input name="currency" type="hidden" value={course.currency} />
                <input name="slug" type="hidden" value={course.slug} />
                <input name="subtitle" type="hidden" value={course.subtitle} />

                <Input
                  defaultValue={course.title}
                  label="ชื่อคอร์ส"
                  name="title"
                  required
                />
                <Textarea
                  defaultValue={course.description}
                  label="คำอธิบาย"
                  name="description"
                  rows={4}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    defaultValue={normalizeSubjectCategory(
                      course.subjectCategory,
                      course.category || course.subject,
                    )}
                    label="วิชา"
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
                    defaultValue={normalizeGradeLevel(
                      course.gradeLevel,
                      course.level,
                    )}
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
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    defaultValue={formatThaiBahtFromCents(course.priceCents)}
                    label="ราคา (บาท)"
                    min="0"
                    name="priceThb"
                    required
                    type="number"
                  />
                  <Select
                    defaultValue={course.teacherName || TEACHER_OPTIONS[0]}
                    label="ชื่อครูผู้สอน"
                    name="teacherName"
                    required
                  >
                    {TEACHER_OPTIONS.map((teacherName) => (
                      <option key={teacherName} value={teacherName}>
                        {teacherName}
                      </option>
                    ))}
                  </Select>
                </div>

                <Input
                  accept="video/*"
                  hint="ไม่บังคับ ใช้เฉพาะกรณีต้องการเปลี่ยน VDO หลักอย่างรวดเร็ว"
                  label="เปลี่ยน VDO หลัก"
                  name="videoFile"
                  type="file"
                />
                <Select
                  defaultValue={course.isPublished ? "READY" : "DRAFT"}
                  label="สถานะคอร์ส"
                  name="status"
                  required
                >
                  <option value="DRAFT">ฉบับร่าง / ส่วนตัว</option>
                  <option value="READY">เผยแพร่</option>
                </Select>
                <Button type="submit">บันทึกข้อมูลคอร์ส</Button>
              </form>
            </CardContent>
          </Card>

          <Card variant="soft">
            <CardHeader>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-700">
                2. Quick Add
              </p>
              <CardTitle>เพิ่ม Chapter ใหม่</CardTitle>
              <CardDescription>
                เพิ่มหัวข้อใหญ่ก่อน แล้วค่อยเปิด Chapter เพื่อเพิ่ม lesson และ VDO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createChapterAction} className="grid gap-4">
                <input name="courseId" type="hidden" value={course.id} />
                <Input label="ชื่อ Chapter" name="title" required />
                <Input label="คำอธิบายสั้น ๆ" name="description" />
                <Input
                  defaultValue={chapterCount + 1}
                  label="ลำดับ"
                  min="1"
                  name="sortOrder"
                  type="number"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {checkboxLabel({
                    name: "isPublished",
                    label: "เผยแพร่",
                    defaultChecked: true,
                  })}
                  <Button type="submit">เพิ่ม Chapter</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-700">
                3. Course Content
              </p>
              <h2 className="font-heading text-2xl font-bold text-ink">
                เนื้อหาในคอร์ส
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                คลิกเปิดเฉพาะ Chapter ที่ต้องการแก้ จะช่วยให้หน้าไม่ยาวและไม่รก
              </p>
            </div>
            <Badge variant="neutral" size="md">
              {lessonCount} บทเรียน
            </Badge>
          </div>

          {course.chapters.map((chapter, index) => (
            <Card key={chapter.id} padding="none">
              <details className="group" open={index === 0}>
                <summary className="flex cursor-pointer list-none flex-col gap-3 px-5 py-4 transition hover:bg-surface-soft sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="primary">Chapter {chapter.sortOrder}</Badge>
                      {statusBadge(chapter.isPublished)}
                      <span className="text-xs font-semibold text-ink-muted">
                        {chapter.lessons.length} บทเรียน
                      </span>
                    </div>
                    <h3 className="mt-2 font-heading text-lg font-bold text-ink">
                      {chapter.title}
                    </h3>
                    {chapter.description ? (
                      <p className="mt-1 text-sm text-ink-muted">
                        {chapter.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold text-primary-700 transition group-open:bg-primary group-open:text-white">
                    เปิดดู/ซ่อน
                  </span>
                </summary>

                <div className="border-t border-line p-5">
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <Card variant="soft" padding="sm">
                      <CardHeader>
                        <CardTitle className="text-base">
                          ตั้งค่า Chapter
                        </CardTitle>
                        <CardDescription>
                          เปลี่ยนชื่อ คำอธิบาย ลำดับ และสถานะ
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form action={updateChapterAction} className="grid gap-3">
                          <input name="courseId" type="hidden" value={course.id} />
                          <input name="chapterId" type="hidden" value={chapter.id} />
                          <Input
                            defaultValue={chapter.title}
                            label="ชื่อ Chapter"
                            name="title"
                            required
                            size="sm"
                          />
                          <Input
                            defaultValue={chapter.description ?? ""}
                            label="คำอธิบาย"
                            name="description"
                            size="sm"
                          />
                          <div className="grid gap-3 sm:grid-cols-[120px_1fr] sm:items-end">
                            <Input
                              defaultValue={chapter.sortOrder}
                              label="ลำดับ"
                              min="1"
                              name="sortOrder"
                              size="sm"
                              type="number"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              {checkboxLabel({
                                name: "isPublished",
                                label: "เผยแพร่",
                                defaultChecked: chapter.isPublished,
                              })}
                              <Button size="sm" type="submit" variant="outline">
                                บันทึก Chapter
                              </Button>
                            </div>
                          </div>
                        </form>
                      </CardContent>
                    </Card>

                    <Card variant="soft" padding="sm">
                      <CardHeader>
                        <CardTitle className="text-base">
                          เพิ่ม Lesson
                        </CardTitle>
                        <CardDescription>
                          เพิ่มบทเรียนใหม่และเลือก VDO ที่อัปโหลดไว้แล้ว
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form action={createLessonAction} className="grid gap-3">
                          <input name="courseId" type="hidden" value={course.id} />
                          <input name="chapterId" type="hidden" value={chapter.id} />
                          <Input
                            label="ชื่อ Lesson"
                            name="title"
                            required
                            size="sm"
                          />
                          <Textarea
                            label="คำอธิบาย Lesson"
                            name="description"
                            rows={3}
                          />
                          <div className="grid gap-3 md:grid-cols-[100px_130px_1fr]">
                            <Input
                              defaultValue={chapter.lessons.length + 1}
                              label="ลำดับ"
                              min="1"
                              name="sortOrder"
                              size="sm"
                              type="number"
                            />
                            <Input
                              label="วินาที"
                              min="0"
                              name="durationSeconds"
                              size="sm"
                              type="number"
                            />
                            <Select label="เลือก VDO" name="videoAssetId" size="sm">
                              <option value="">ยังไม่เลือกวิดีโอ</option>
                              {videoAssets.map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                  {asset.title} ({asset.status})
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-4">
                              {checkboxLabel({
                                name: "isPreview",
                                label: "ตัวอย่าง",
                                compact: true,
                              })}
                              {checkboxLabel({
                                name: "isPublished",
                                label: "เผยแพร่",
                                compact: true,
                              })}
                            </div>
                            <Button size="sm" type="submit">
                              เพิ่ม Lesson
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {chapter.lessons.length ? (
                      chapter.lessons.map((lesson) => (
                        <form
                          action={updateLessonAction}
                          className="rounded-2xl border border-line bg-surface-soft p-4"
                          key={lesson.id}
                        >
                          <input name="courseId" type="hidden" value={course.id} />
                          <input name="lessonId" type="hidden" value={lesson.id} />
                          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_100px_120px_minmax(220px,0.8fr)_auto]">
                            <div>
                              <Input
                                defaultValue={lesson.title}
                                label="ชื่อ Lesson"
                                name="title"
                                required
                                size="sm"
                              />
                              <details className="mt-3">
                                <summary className="cursor-pointer text-xs font-bold text-primary-700">
                                  แก้คำอธิบาย
                                </summary>
                                <Textarea
                                  className="mt-2"
                                  defaultValue={lesson.description ?? ""}
                                  label="คำอธิบาย Lesson"
                                  name="description"
                                  rows={3}
                                />
                              </details>
                            </div>
                            <Input
                              defaultValue={lesson.sortOrder}
                              label="ลำดับ"
                              min="1"
                              name="sortOrder"
                              size="sm"
                              type="number"
                            />
                            <Input
                              defaultValue={lesson.durationSeconds ?? ""}
                              label="วินาที"
                              min="0"
                              name="durationSeconds"
                              size="sm"
                              type="number"
                            />
                            <div>
                              <Select
                                defaultValue={lesson.videoAssetId ?? ""}
                                label="VDO"
                                name="videoAssetId"
                                size="sm"
                              >
                                <option value="">ยังไม่เลือกวิดีโอ</option>
                                {videoAssets.map((asset) => (
                                  <option key={asset.id} value={asset.id}>
                                    {asset.title} ({asset.status})
                                  </option>
                                ))}
                              </Select>
                              <div className="mt-2">
                                {lesson.videoAsset ? (
                                  <Badge
                                    variant={
                                      lesson.videoAsset.status === "READY"
                                        ? "success"
                                        : "warning"
                                    }
                                  >
                                    {lesson.videoAsset.status}
                                  </Badge>
                                ) : (
                                  <Badge variant="warning">ยังไม่มี VDO</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col justify-end gap-2">
                              {checkboxLabel({
                                name: "isPreview",
                                label: "ตัวอย่าง",
                                defaultChecked: lesson.isPreview,
                                compact: true,
                              })}
                              {checkboxLabel({
                                name: "isPublished",
                                label: "เผยแพร่",
                                defaultChecked: lesson.isPublished,
                                compact: true,
                              })}
                              <Button size="sm" type="submit" variant="outline">
                                บันทึก
                              </Button>
                            </div>
                          </div>
                        </form>
                      ))
                    ) : (
                      <p className="rounded-card border border-dashed border-line p-4 text-center text-sm text-ink-muted">
                        ยังไม่มี lesson ใน chapter นี้
                      </p>
                    )}
                  </div>
                </div>
              </details>
            </Card>
          ))}

          {!course.chapters.length ? (
            <Card className="text-center text-sm text-ink-muted">
              ยังไม่มี Chapter กดเพิ่มจากกล่อง Quick Add ด้านบนได้เลย
            </Card>
          ) : null}
        </section>
      </div>
    </AdminShell>
  );
}
