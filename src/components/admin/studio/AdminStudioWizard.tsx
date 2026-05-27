"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TEACHER_OPTIONS } from "@/lib/course-taxonomy";
import { StudioStep1Details } from "./StudioStep1Details";
import type { StudioMode } from "./StudioStep1Details";
import { StudioStep2Content } from "./StudioStep2Content";
import { StudioStep3Review } from "./StudioStep3Review";
import { StudioStepper } from "./StudioStepper";

type WizardStep = 1 | 2 | 3;

type AdminStudioWizardProps = {
  action: (formData: FormData) => void | Promise<void>;
  maxVideoBytes: number;
};

const allowedVideoTypes = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/mpeg",
]);

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 MB";
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidPrice(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

export function AdminStudioWizard({
  action,
  maxVideoBytes,
}: AdminStudioWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [mode, setMode] = useState<StudioMode>("COURSE");
  const [subjectCategory, setSubjectCategory] = useState("Math");
  const [gradeLevel, setGradeLevel] = useState("A-Level");
  const [title, setTitle] = useState("");
  const [priceThb, setPriceThb] = useState("0");
  const [description, setDescription] = useState("");
  const [teacherName, setTeacherName] = useState<string>(
    TEACHER_OPTIONS[0] ?? "",
  );
  const [chapterTitle, setChapterTitle] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [coverFeedback, setCoverFeedback] = useState("");
  const [coverError, setCoverError] = useState("");
  const [videoFeedback, setVideoFeedback] = useState("");
  const [videoError, setVideoError] = useState("");
  const [stepError, setStepError] = useState("");

  const maxBytesLabel = useMemo(() => formatBytes(maxVideoBytes), [
    maxVideoBytes,
  ]);

  useEffect(() => {
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  useEffect(() => {
    setStepError("");
  }, [currentStep]);

  const hasClientError = Boolean(coverError || videoError);

  function handleCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    if (!file) {
      setCoverPreview("");
      setCoverFeedback("");
      setCoverError("");
      return;
    }

    if (file.type !== "image/png") {
      setCoverPreview("");
      setCoverFeedback(file.name);
      setCoverError("กรุณาเลือกไฟล์ PNG เท่านั้น");
      return;
    }

    setCoverError("");
    setCoverFeedback(`${file.name} · ${formatBytes(file.size)}`);
    setCoverPreview(URL.createObjectURL(file));
  }

  function handleVideoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setVideoFeedback("");
      setVideoError("");
      return;
    }

    if (!allowedVideoTypes.has(file.type)) {
      setVideoFeedback(file.name);
      setVideoError("รองรับเฉพาะ MP4, WebM, MOV, M4V หรือ MPEG");
      return;
    }

    if (file.size > maxVideoBytes) {
      setVideoFeedback(`${file.name} · ${formatBytes(file.size)}`);
      setVideoError(`ไฟล์ใหญ่เกินกำหนด (${maxBytesLabel})`);
      return;
    }

    setVideoError("");
    setVideoFeedback(`${file.name} · ${formatBytes(file.size)}`);
  }

  function validateStep1() {
    if (!title.trim()) {
      return "กรุณากรอกชื่อคอร์ส/แพ็คเกจ";
    }

    if (!description.trim()) {
      return "กรุณากรอกคำอธิบาย";
    }

    if (!isValidPrice(priceThb)) {
      return "กรุณากรอกราคาเป็นตัวเลขที่ไม่ติดลบ";
    }

    if (!coverFeedback || coverError) {
      return coverError || "กรุณาเลือกรูปปก PNG";
    }

    return "";
  }

  function validateStep2() {
    if (!lessonTitle.trim()) {
      return "กรุณากรอกชื่อบทเรียน / VDO";
    }

    if (!videoFeedback || videoError) {
      return videoError || "กรุณาเลือกไฟล์ VDO";
    }

    return "";
  }

  function handleNext() {
    if (currentStep === 1) {
      const error = validateStep1();
      if (error) {
        setStepError(error);
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      const error = validateStep2();
      if (error) {
        setStepError(error);
        return;
      }
      setCurrentStep(3);
    }
  }

  function handleBack() {
    if (currentStep === 2) {
      setCurrentStep(1);
      return;
    }

    if (currentStep === 3) {
      setCurrentStep(2);
    }
  }

  function handleStepClick(step: WizardStep) {
    if (step >= currentStep) {
      return;
    }

    setCurrentStep(step);
  }

  return (
    <form
      action={action}
      className="grid gap-5"
      encType="multipart/form-data"
    >
      <input name="currency" type="hidden" value="THB" />
      {/* Mirror lessonTitle as videoTitle for backwards-compatible server action */}
      <input name="videoTitle" type="hidden" value={lessonTitle} />
      {/* Chapter number defaults to 1 so PACKAGE branch passes validation */}
      <input name="chapterNumber" type="hidden" value="1" />

      <StudioStepper
        currentStep={currentStep}
        onStepClick={handleStepClick}
      />

      {stepError ? (
        <p className="rounded-card bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          {stepError}
        </p>
      ) : null}

      <StudioStep1Details
        active={currentStep === 1}
        coverError={coverError}
        coverFeedback={coverFeedback}
        description={description}
        gradeLevel={gradeLevel}
        mode={mode}
        onCoverFileChange={handleCoverFileChange}
        onDescriptionChange={setDescription}
        onGradeLevelChange={setGradeLevel}
        onModeChange={setMode}
        onPriceThbChange={setPriceThb}
        onSubjectCategoryChange={setSubjectCategory}
        onTeacherNameChange={setTeacherName}
        onTitleChange={setTitle}
        priceThb={priceThb}
        subjectCategory={subjectCategory}
        teacherName={teacherName}
        title={title}
      />

      <StudioStep2Content
        active={currentStep === 2}
        chapterTitle={chapterTitle}
        lessonTitle={lessonTitle}
        maxVideoBytesLabel={maxBytesLabel}
        onChapterTitleChange={setChapterTitle}
        onLessonTitleChange={setLessonTitle}
        onVideoFileChange={handleVideoFileChange}
        videoError={videoError}
        videoFeedback={videoFeedback}
      />

      <StudioStep3Review
        active={currentStep === 3}
        chapterTitle={chapterTitle}
        coverFeedback={coverFeedback}
        coverPreviewUrl={coverPreview}
        description={description}
        gradeLevel={gradeLevel}
        hasClientError={hasClientError}
        lessonTitle={lessonTitle}
        mode={mode}
        priceThb={priceThb}
        subjectCategory={subjectCategory}
        teacherName={teacherName}
        title={title}
        videoFeedback={videoFeedback}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          disabled={currentStep === 1}
          onClick={handleBack}
          type="button"
          variant="outline"
        >
          ย้อนกลับ
        </Button>
        {currentStep < 3 ? (
          <Button onClick={handleNext} type="button">
            ถัดไป
          </Button>
        ) : (
          <p className="text-xs text-ink-muted">
            เลือกสถานะที่ต้องการแล้วกดปุ่มสร้างด้านบน
          </p>
        )}
      </div>
    </form>
  );
}
