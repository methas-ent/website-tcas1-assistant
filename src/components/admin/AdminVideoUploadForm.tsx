"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  GRADE_LEVEL_LABELS,
  GRADE_LEVEL_OPTIONS,
  SUBJECT_CATEGORY_LABELS,
  SUBJECT_CATEGORY_OPTIONS,
} from "@/lib/course-taxonomy";
import type { AdminVideoUploadCourse } from "@/lib/admin-video";

type AdminVideoUploadFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  courses: AdminVideoUploadCourse[];
  returnTo?: string;
};

function courseSubject(course: AdminVideoUploadCourse) {
  return course.subjectCategory || "Other";
}

function courseGrade(course: AdminVideoUploadCourse) {
  return course.gradeLevel || "Other";
}

export function AdminVideoUploadForm({
  action,
  courses,
  returnTo,
}: AdminVideoUploadFormProps) {
  const [subjectCategory, setSubjectCategory] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [courseId, setCourseId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [fileFeedback, setFileFeedback] = useState("");

  const filteredCourses = useMemo(
    () =>
      courses.filter(
        (course) =>
          (!subjectCategory || courseSubject(course) === subjectCategory) &&
          (!gradeLevel || courseGrade(course) === gradeLevel),
      ),
    [courses, gradeLevel, subjectCategory],
  );

  const selectedCourse = useMemo(
    () => filteredCourses.find((course) => course.id === courseId),
    [courseId, filteredCourses],
  );

  const selectedChapter = useMemo(
    () => selectedCourse?.chapters.find((chapter) => chapter.id === chapterId),
    [chapterId, selectedCourse],
  );

  useEffect(() => {
    if (courseId && !filteredCourses.some((course) => course.id === courseId)) {
      setCourseId("");
      setChapterId("");
      setLessonId("");
    }
  }, [courseId, filteredCourses]);

  useEffect(() => {
    if (
      chapterId &&
      !selectedCourse?.chapters.some((chapter) => chapter.id === chapterId)
    ) {
      setChapterId("");
      setLessonId("");
    }
  }, [chapterId, selectedCourse]);

  useEffect(() => {
    if (
      lessonId &&
      !selectedChapter?.lessons.some((lesson) => lesson.id === lessonId)
    ) {
      setLessonId("");
    }
  }, [lessonId, selectedChapter]);

  return (
    <form action={action} className="mt-6 grid gap-5" encType="multipart/form-data">
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="หมวดวิชา"
          name="subjectCategory"
          onChange={(event) => {
            setSubjectCategory(event.target.value);
            setCourseId("");
            setChapterId("");
            setLessonId("");
          }}
          required
          value={subjectCategory}
        >
          <option value="">เลือกหมวดวิชา</option>
          {SUBJECT_CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SUBJECT_CATEGORY_LABELS[option]}
            </option>
          ))}
        </Select>

        <Select
          label="ระดับชั้น (ไม่บังคับ)"
          name="gradeLevel"
          onChange={(event) => {
            setGradeLevel(event.target.value);
            setCourseId("");
            setChapterId("");
            setLessonId("");
          }}
          value={gradeLevel}
        >
          <option value="">ทุกระดับชั้น</option>
          {GRADE_LEVEL_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {GRADE_LEVEL_LABELS[option]}
            </option>
          ))}
        </Select>
      </div>

      <Select
        disabled={!subjectCategory || filteredCourses.length === 0}
        hint={
          subjectCategory
            ? `${filteredCourses.length} คอร์สตรงกับตัวกรอง`
            : "เลือกหมวดวิชาก่อน"
        }
        label="ชื่อคอร์ส"
        name="courseId"
        onChange={(event) => {
          setCourseId(event.target.value);
          setChapterId("");
          setLessonId("");
        }}
        required
        value={courseId}
      >
        <option value="">เลือกคอร์ส</option>
        {filteredCourses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title} - {GRADE_LEVEL_LABELS[courseGrade(course)]} ({course.slug})
          </option>
        ))}
      </Select>

      <Select
        disabled={!selectedCourse}
        hint="ไม่บังคับ ถ้ายังไม่ต้องการผูกกับบทเรียนให้เว้นไว้"
        label="Chapter (ไม่บังคับ)"
        name="chapterId"
        onChange={(event) => {
          setChapterId(event.target.value);
          setLessonId("");
        }}
        value={chapterId}
      >
        <option value="">ยังไม่ผูก chapter</option>
        {selectedCourse?.chapters.map((chapter) => (
          <option key={chapter.id} value={chapter.id}>
            {chapter.sortOrder}. {chapter.title}
          </option>
        ))}
      </Select>

      <Select
        disabled={!selectedChapter}
        hint="ถ้าเลือก lesson ระบบจะ attach วิดีโอนี้ให้ lesson นั้นทันที"
        label="Lesson (ไม่บังคับ)"
        name="lessonId"
        onChange={(event) => setLessonId(event.target.value)}
        value={lessonId}
      >
        <option value="">ยังไม่ผูก lesson</option>
        {selectedChapter?.lessons.map((lesson) => (
          <option key={lesson.id} value={lesson.id}>
            {lesson.sortOrder}. {lesson.title}
            {lesson.videoAssetId ? " - มีวิดีโอแล้ว" : ""}
          </option>
        ))}
      </Select>

      <Input label="ชื่อวิดีโอ" name="title" required />
      <Textarea label="คำอธิบายวิดีโอ" name="description" />

      <label className="grid gap-1.5">
        <span className="text-sm font-bold text-ink-soft">ไฟล์วิดีโอ</span>
        <input
          accept="video/*"
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-sm"
          name="file"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (!file) {
              setFileFeedback("");
              return;
            }

            const sizeMb = file.size / (1024 * 1024);
            const typeLabel = file.type || "unknown type";
            setFileFeedback(
              `${file.name} · ${typeLabel} · ${sizeMb.toFixed(1)} MB`,
            );
          }}
          required
          type="file"
        />
        <span className="text-xs text-ink-muted">
          รองรับ MP4, WebM, MOV, M4V และ MPEG สำหรับ development เท่านั้น
        </span>
        {fileFeedback ? (
          <span className="rounded-card bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700">
            ไฟล์ที่เลือก: {fileFeedback}
          </span>
        ) : null}
      </label>

      <p className="rounded-card bg-surface-soft px-4 py-3 text-xs font-semibold text-ink-muted">
        เลือกเพียงหมวดวิชาและคอร์สก็อัปโหลด VDO ได้ทันที หากเลือก lesson เพิ่ม ระบบจะ attach วิดีโอใหม่ให้ lesson นั้น
      </p>

      <Button type="submit">อัปโหลด VDO</Button>
    </form>
  );
}
