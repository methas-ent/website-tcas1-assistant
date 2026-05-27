"use client";

import type { ChangeEvent } from "react";
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
  GRADE_LEVEL_LABELS,
  GRADE_LEVEL_OPTIONS,
  SUBJECT_CATEGORY_LABELS,
  SUBJECT_CATEGORY_OPTIONS,
  TEACHER_OPTIONS,
} from "@/lib/course-taxonomy";

export type StudioMode = "COURSE" | "PACKAGE";

type StudioStep1DetailsProps = {
  active: boolean;
  mode: StudioMode;
  onModeChange: (value: StudioMode) => void;
  subjectCategory: string;
  onSubjectCategoryChange: (value: string) => void;
  gradeLevel: string;
  onGradeLevelChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  teacherName: string;
  onTeacherNameChange: (value: string) => void;
  priceThb: string;
  onPriceThbChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  coverFeedback: string;
  coverError: string;
  onCoverFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function StudioStep1Details({
  active,
  mode,
  onModeChange,
  subjectCategory,
  onSubjectCategoryChange,
  gradeLevel,
  onGradeLevelChange,
  title,
  onTitleChange,
  teacherName,
  onTeacherNameChange,
  priceThb,
  onPriceThbChange,
  description,
  onDescriptionChange,
  coverFeedback,
  coverError,
  onCoverFileChange,
}: StudioStep1DetailsProps) {
  return (
    <div className={active ? "grid gap-5" : "hidden"} aria-hidden={!active}>
      <Card>
        <CardHeader>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-700">
            ขั้นตอนที่ 1
          </p>
          <CardTitle>รายละเอียดคอร์ส/แพ็คเกจ</CardTitle>
          <CardDescription>
            เลือกประเภท หมวดวิชา ระดับชั้น และข้อมูลหลักที่จะใช้แสดงทั้งใน admin
            และในหน้านักเรียน
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-bold text-ink-soft">
              ประเภท *
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm transition ${
                  mode === "COURSE"
                    ? "border-primary-300 bg-primary-50 text-primary-700 shadow-sm"
                    : "border-line bg-surface text-ink-soft hover:border-primary-200"
                }`}
              >
                <input
                  checked={mode === "COURSE"}
                  className="mt-1 h-4 w-4"
                  name="itemType"
                  onChange={() => onModeChange("COURSE")}
                  type="radio"
                  value="COURSE"
                />
                <span>
                  <span className="block font-bold">Course</span>
                  <span className="block text-xs text-ink-muted">
                    คอร์สเดี่ยว สร้าง Chapter 1 และบทเรียนแรกอัตโนมัติ
                  </span>
                </span>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm transition ${
                  mode === "PACKAGE"
                    ? "border-primary-300 bg-primary-50 text-primary-700 shadow-sm"
                    : "border-line bg-surface text-ink-soft hover:border-primary-200"
                }`}
              >
                <input
                  checked={mode === "PACKAGE"}
                  className="mt-1 h-4 w-4"
                  name="itemType"
                  onChange={() => onModeChange("PACKAGE")}
                  type="radio"
                  value="PACKAGE"
                />
                <span>
                  <span className="block font-bold">Package</span>
                  <span className="block text-xs text-ink-muted">
                    แพ็คเกจรวมคอร์ส พร้อมระบุเลข Chapter เริ่มต้น
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="หมวดวิชา *"
              name="subjectCategory"
              onChange={(event) => onSubjectCategoryChange(event.target.value)}
              required
              value={subjectCategory}
            >
              {SUBJECT_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SUBJECT_CATEGORY_LABELS[option]}
                </option>
              ))}
            </Select>
            <Select
              label="ระดับชั้น *"
              name="gradeLevel"
              onChange={(event) => onGradeLevelChange(event.target.value)}
              required
              value={gradeLevel}
            >
              {GRADE_LEVEL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {GRADE_LEVEL_LABELS[option]}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label={mode === "PACKAGE" ? "ชื่อแพ็คเกจ *" : "ชื่อคอร์ส *"}
            name="title"
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="เช่น Bio A-Level, Math TCAS Intensive"
            required
            value={title}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="ครูผู้สอน *"
              name="teacherName"
              onChange={(event) => onTeacherNameChange(event.target.value)}
              required
              value={teacherName}
            >
              {TEACHER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Input
              label="ราคา (บาท) *"
              min="0"
              name="priceThb"
              onChange={(event) => onPriceThbChange(event.target.value)}
              required
              step="1"
              type="number"
              value={priceThb}
            />
          </div>

          <Textarea
            label="คำอธิบาย *"
            name="description"
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="อธิบายเป้าหมายคอร์ส สิ่งที่ผู้เรียนจะได้ และเนื้อหาหลัก"
            required
            rows={5}
            value={description}
          />

          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-ink-soft">
              รูปปก (PNG) *
            </span>
            <input
              accept="image/png"
              className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-sm"
              name="coverImageFile"
              onChange={onCoverFileChange}
              required
              type="file"
            />
            <span className="text-xs text-ink-muted">
              ใช้เป็นรูปปกใน catalog และหน้าคอร์ส รับเฉพาะ PNG
            </span>
            {coverError ? (
              <span className="rounded-card bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
                {coverError}
              </span>
            ) : coverFeedback ? (
              <span className="rounded-card bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700">
                รูปปกที่เลือก: {coverFeedback}
              </span>
            ) : null}
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
