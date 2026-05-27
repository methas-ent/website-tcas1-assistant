"use client";

import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  GRADE_LEVEL_LABELS,
  SUBJECT_CATEGORY_LABELS,
} from "@/lib/course-taxonomy";

type StudioMode = "COURSE" | "PACKAGE";

type StudioStep3ReviewProps = {
  active: boolean;
  mode: StudioMode;
  subjectCategory: string;
  gradeLevel: string;
  title: string;
  teacherName: string;
  priceThb: string;
  description: string;
  chapterTitle: string;
  lessonTitle: string;
  coverPreviewUrl: string;
  coverFeedback: string;
  videoFeedback: string;
  hasClientError: boolean;
};

function StudioSubmitActions({
  hasClientError,
}: {
  hasClientError: boolean;
}) {
  const { pending } = useFormStatus();
  const disabled = pending || hasClientError;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <Button
        disabled={disabled}
        name="submitStatus"
        type="submit"
        value="DRAFT"
        variant="secondary"
      >
        {pending ? "กำลังบันทึก..." : "บันทึกเป็น Draft"}
      </Button>
      <Button
        disabled={disabled}
        name="submitStatus"
        type="submit"
        value="PRIVATE"
        variant="outline"
      >
        ตั้งเป็น Private
      </Button>
      <Button
        disabled={disabled}
        name="submitStatus"
        type="submit"
        value="PUBLISHED"
      >
        เผยแพร่
      </Button>
    </div>
  );
}

export function StudioStep3Review({
  active,
  mode,
  subjectCategory,
  gradeLevel,
  title,
  teacherName,
  priceThb,
  description,
  chapterTitle,
  lessonTitle,
  coverPreviewUrl,
  coverFeedback,
  videoFeedback,
  hasClientError,
}: StudioStep3ReviewProps) {
  const subjectLabel =
    SUBJECT_CATEGORY_LABELS[
      subjectCategory as keyof typeof SUBJECT_CATEGORY_LABELS
    ] ?? subjectCategory;
  const gradeLabel =
    GRADE_LEVEL_LABELS[gradeLevel as keyof typeof GRADE_LEVEL_LABELS] ??
    gradeLevel;
  const priceValue = Number.parseFloat(priceThb || "0");
  const priceLabel =
    Number.isFinite(priceValue) && priceValue >= 0
      ? `${priceValue.toLocaleString("th-TH")} บาท`
      : "ราคายังไม่ถูกต้อง";
  const lessonDisplayTitle = lessonTitle || "ยังไม่ได้ระบุชื่อบทเรียน";
  const chapterDisplayTitle = chapterTitle || "บทเรียนที่ 1";
  const descriptionPreview = description.trim()
    ? description.length > 240
      ? `${description.slice(0, 240)}...`
      : description
    : "ยังไม่ได้กรอกคำอธิบาย";

  return (
    <div className={active ? "grid gap-5" : "hidden"} aria-hidden={!active}>
      <Card>
        <CardHeader>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-700">
            ขั้นตอนที่ 3
          </p>
          <CardTitle>ตรวจสอบและเผยแพร่</CardTitle>
          <CardDescription>
            ตรวจสอบข้อมูลก่อนบันทึก เลือกสถานะ Draft / Private / Published
            ตามต้องการ
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-2xl border border-line bg-surface-soft">
              {coverPreviewUrl ? (
                <div
                  aria-label="Cover preview"
                  className="aspect-video w-full bg-cover bg-center"
                  role="img"
                  style={{ backgroundImage: `url(${coverPreviewUrl})` }}
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-sm font-bold text-ink-muted">
                  PNG cover preview
                </div>
              )}
            </div>

            <dl className="grid gap-3 text-sm">
              <div className="flex flex-wrap justify-between gap-3">
                <dt className="text-ink-muted">ประเภท</dt>
                <dd>
                  <Badge variant={mode === "PACKAGE" ? "accent" : "primary"}>
                    {mode === "PACKAGE" ? "Package" : "Course"}
                  </Badge>
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <dt className="text-ink-muted">ชื่อ</dt>
                <dd className="text-right font-bold text-ink">
                  {title || "ยังไม่ได้ระบุ"}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <dt className="text-ink-muted">หมวดวิชา</dt>
                <dd className="text-right text-ink">{subjectLabel}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <dt className="text-ink-muted">ระดับชั้น</dt>
                <dd className="text-right text-ink">{gradeLabel}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <dt className="text-ink-muted">ครูผู้สอน</dt>
                <dd className="text-right text-ink">{teacherName}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <dt className="text-ink-muted">ราคา</dt>
                <dd className="font-bold text-primary-700">{priceLabel}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-ink-muted">คำอธิบาย</dt>
                <dd className="text-ink">{descriptionPreview}</dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-3 rounded-2xl border border-line bg-surface-soft p-4 text-sm">
            <p className="font-bold text-ink">เนื้อหาบทเรียนแรก</p>
            <div className="grid gap-2 text-ink-soft">
              <p>
                <span className="text-ink-muted">Chapter:</span>{" "}
                <span className="font-bold text-ink">{chapterDisplayTitle}</span>
              </p>
              <p>
                <span className="text-ink-muted">บทเรียน / VDO:</span>{" "}
                <span className="font-bold text-ink">{lessonDisplayTitle}</span>
              </p>
              <p>
                <span className="text-ink-muted">ไฟล์ VDO:</span>{" "}
                <span className="text-ink">
                  {videoFeedback || "ยังไม่ได้เลือกไฟล์"}
                </span>
              </p>
              <p>
                <span className="text-ink-muted">รูปปก:</span>{" "}
                <span className="text-ink">
                  {coverFeedback || "ยังไม่ได้เลือกรูป"}
                </span>
              </p>
            </div>
          </div>

          <StudioSubmitActions hasClientError={hasClientError} />
        </CardContent>
      </Card>
    </div>
  );
}
