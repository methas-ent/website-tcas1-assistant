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

type StudioStep2ContentProps = {
  active: boolean;
  chapterTitle: string;
  onChapterTitleChange: (value: string) => void;
  lessonTitle: string;
  onLessonTitleChange: (value: string) => void;
  videoFeedback: string;
  videoError: string;
  onVideoFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  maxVideoBytesLabel: string;
};

export function StudioStep2Content({
  active,
  chapterTitle,
  onChapterTitleChange,
  lessonTitle,
  onLessonTitleChange,
  videoFeedback,
  videoError,
  onVideoFileChange,
  maxVideoBytesLabel,
}: StudioStep2ContentProps) {
  return (
    <div className={active ? "grid gap-5" : "hidden"} aria-hidden={!active}>
      <Card>
        <CardHeader>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-700">
            ขั้นตอนที่ 2
          </p>
          <CardTitle>เนื้อหา VDO ของบทเรียนแรก</CardTitle>
          <CardDescription>
            ใส่ชื่อ Chapter ชื่อบทเรียน และอัปโหลดไฟล์ VDO
            ระบบจะใช้คำอธิบายจากขั้นตอนที่ 1 เป็นรายละเอียดบทเรียน
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Input
            hint="ถ้าเว้นว่าง ระบบจะตั้งให้เป็น 'บทเรียนที่ 1'"
            label="ชื่อ Chapter"
            name="chapterTitle"
            onChange={(event) => onChapterTitleChange(event.target.value)}
            placeholder="เช่น บทเรียนที่ 1"
            value={chapterTitle}
          />

          <Input
            hint="จะใช้เป็นทั้งชื่อบทเรียนและชื่อไฟล์ VDO"
            label="ชื่อบทเรียน / VDO *"
            name="lessonTitle"
            onChange={(event) => onLessonTitleChange(event.target.value)}
            placeholder="เช่น Set Logic EP 1"
            required
            value={lessonTitle}
          />

          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-ink-soft">
              ไฟล์วิดีโอ *
            </span>
            <input
              accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/mpeg"
              className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-sm"
              name="videoFile"
              onChange={onVideoFileChange}
              required
              type="file"
            />
            <span className="text-xs text-ink-muted">
              รองรับ MP4, WebM, MOV, M4V หรือ MPEG (สำหรับ development)
              ขนาดไม่เกิน {maxVideoBytesLabel}
            </span>
            {videoError ? (
              <span className="rounded-card bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
                {videoError}
              </span>
            ) : videoFeedback ? (
              <span className="rounded-card bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700">
                VDO ที่เลือก: {videoFeedback}
              </span>
            ) : null}
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
