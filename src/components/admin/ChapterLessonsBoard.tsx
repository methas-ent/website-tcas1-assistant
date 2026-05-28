"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/components/ui/cn";
import {
  VideoAssetPicker,
  type VideoAssetPickerOption,
} from "@/components/admin/VideoAssetPicker";
import {
  createLessonAction,
  reorderLessonsAction,
  updateLessonAction,
} from "@/lib/admin-catalog-actions";
import { updateLessonPayTimeConfigAction } from "@/lib/admin-pay-time-actions";
import { formatThaiBahtFromCents } from "@/lib/admin-catalog";

export type ChapterLessonBoardLesson = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  epNumber: number;
  durationSeconds: number | null;
  videoAssetId: string | null;
  isPreview: boolean;
  isPublished: boolean;
  payTimeEnabled: boolean;
  payTimePriceCents: number;
  payTimeHours: number;
  payTimeDescription: string | null;
  videoAsset: {
    id: string;
    title: string;
    status: string;
  } | null;
};

type ChapterLessonsBoardProps = {
  courseId: string;
  chapterId: string;
  lessons: ChapterLessonBoardLesson[];
};

function formatSeconds(value: number | null) {
  if (!value || value <= 0) return "—";
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function ChapterLessonsBoard({
  courseId,
  chapterId,
  lessons,
}: ChapterLessonsBoardProps) {
  const [items, setItems] = useState<ChapterLessonBoardLesson[]>(lessons);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const previousRef = useRef<ChapterLessonBoardLesson[]>(lessons);

  // Keep local state in sync with server-rendered lessons (e.g. after add/edit
  // triggers a server-action revalidate). We only overwrite when the incoming
  // list differs from what we last optimistically rendered.
  useEffect(() => {
    setItems(lessons);
    previousRef.current = lessons;
  }, [lessons]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((l) => l.id === active.id);
    const newIndex = items.findIndex((l) => l.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    previousRef.current = items;
    setItems(reordered);
    setReorderError(null);

    const formData = new FormData();
    formData.set("courseId", courseId);
    formData.set("chapterId", chapterId);
    formData.set(
      "orderedLessonIds",
      JSON.stringify(reordered.map((l) => l.id)),
    );

    startTransition(async () => {
      try {
        await reorderLessonsAction(formData);
      } catch (error) {
        // Next.js redirect() inside server actions throws NEXT_REDIRECT; we
        // treat that as success. Any other failure reverts the order.
        const message =
          error instanceof Error ? error.message : String(error);
        if (message.includes("NEXT_REDIRECT")) return;
        setItems(previousRef.current);
        setReorderError(
          "เรียงลำดับไม่สำเร็จ ระบบได้คืนลำดับเดิมแล้ว",
        );
      }
    });
  }

  const showEmptyComposer = items.length === 0;

  return (
    <div className="grid gap-3">
      {reorderError ? (
        <p className="rounded-card bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
          {reorderError}
        </p>
      ) : null}

      {items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul
              className={cn(
                "grid gap-2",
                pending && "opacity-90",
              )}
            >
              {items.map((lesson, index) => (
                <SortableLessonRow
                  courseId={courseId}
                  index={index}
                  key={lesson.id}
                  lesson={lesson}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}

      <InlineLessonComposer
        autoOpen={showEmptyComposer}
        chapterId={chapterId}
        courseId={courseId}
        nextSortOrder={items.length + 1}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable row
// ---------------------------------------------------------------------------

type SortableLessonRowProps = {
  courseId: string;
  index: number;
  lesson: ChapterLessonBoardLesson;
};

function SortableLessonRow({
  courseId,
  index,
  lesson,
}: SortableLessonRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const epLabel = `EP ${String(index + 1).padStart(2, " ")}`.replace(/ /g, " ");

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-2xl border border-line bg-surface px-3 py-3 shadow-sm transition",
        "hover:bg-surface-soft",
        isDragging && "scale-[1.02] opacity-80 shadow-raised ring-2 ring-primary-200",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label="ลากเพื่อจัดลำดับ"
          className={cn(
            "mt-1 flex h-7 w-6 shrink-0 cursor-grab select-none items-center justify-center rounded-md text-ink-faint",
            "opacity-0 transition group-hover:opacity-100",
            "active:cursor-grabbing focus-visible:opacity-100 focus-visible:outline-none",
            isDragging && "cursor-grabbing opacity-100",
          )}
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon />
        </button>

        <span
          aria-label={`ตอนที่ ${index + 1}`}
          className="mt-1 w-12 shrink-0 select-none font-mono text-xs font-bold tracking-tight text-ink-muted"
        >
          {epLabel}
        </span>

        <div className="min-w-0 flex-1">
          <LessonRowEditor courseId={courseId} lesson={lesson} />
        </div>
      </div>
    </li>
  );
}

function DragHandleIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="6" cy="3.5" r="1.1" fill="currentColor" />
      <circle cx="10" cy="3.5" r="1.1" fill="currentColor" />
      <circle cx="6" cy="8" r="1.1" fill="currentColor" />
      <circle cx="10" cy="8" r="1.1" fill="currentColor" />
      <circle cx="6" cy="12.5" r="1.1" fill="currentColor" />
      <circle cx="10" cy="12.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Lesson row editor (inline title + collapsible details + Pay Time)
// ---------------------------------------------------------------------------

type LessonRowEditorProps = {
  courseId: string;
  lesson: ChapterLessonBoardLesson;
};

function LessonRowEditor({
  courseId,
  lesson,
}: LessonRowEditorProps) {
  const [titleDraft, setTitleDraft] = useState(lesson.title);
  const titleFormRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [videoAssetId, setVideoAssetId] = useState<string | null>(
    lesson.videoAssetId,
  );

  useEffect(() => {
    setVideoAssetId(lesson.videoAssetId);
  }, [lesson.videoAssetId]);

  useEffect(() => {
    setTitleDraft(lesson.title);
  }, [lesson.title]);

  function commitTitleIfChanged() {
    if (titleDraft.trim() === lesson.title.trim()) return;
    if (!titleDraft.trim()) {
      setTitleDraft(lesson.title);
      return;
    }
    const form = titleFormRef.current;
    if (!form) return;
    // Use the hidden full-edit form submission so all current fields
    // (sortOrder, videoAssetId, etc.) round-trip without being touched.
    startTransition(() => {
      form.requestSubmit();
    });
  }

  return (
    <div className="grid gap-2">
      {/* Inline editable title */}
      <form
        action={updateLessonAction}
        className="contents"
        ref={titleFormRef}
      >
        <input name="courseId" type="hidden" value={courseId} />
        <input name="lessonId" type="hidden" value={lesson.id} />
        <input
          name="sortOrder"
          type="hidden"
          value={lesson.sortOrder}
        />
        <input
          name="durationSeconds"
          type="hidden"
          value={lesson.durationSeconds ?? ""}
        />
        <input
          name="videoAssetId"
          type="hidden"
          value={videoAssetId ?? ""}
        />
        <input
          name="description"
          type="hidden"
          value={lesson.description ?? ""}
        />
        {lesson.isPreview ? (
          <input name="isPreview" type="hidden" value="on" />
        ) : null}
        {lesson.isPublished ? (
          <input name="isPublished" type="hidden" value="on" />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label="ชื่อบทเรียน"
            className={cn(
              "min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-bold text-ink transition",
              "hover:border-line focus:border-primary-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-100",
              pending && "opacity-60",
            )}
            name="title"
            onBlur={commitTitleIfChanged}
            onChange={(event) => setTitleDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                (event.target as HTMLInputElement).blur();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setTitleDraft(lesson.title);
                (event.target as HTMLInputElement).blur();
              }
            }}
            placeholder="ชื่อบทเรียน"
            type="text"
            value={titleDraft}
          />
          <div className="flex flex-shrink-0 items-center gap-1.5">
            {lesson.isPublished ? (
              <Badge size="sm" variant="success">
                เผยแพร่
              </Badge>
            ) : (
              <Badge size="sm" variant="warning">
                ฉบับร่าง
              </Badge>
            )}
            {lesson.isPreview ? (
              <Badge size="sm" variant="primary">
                ตัวอย่าง
              </Badge>
            ) : null}
            {lesson.videoAsset ? (
              <Badge
                size="sm"
                variant={
                  lesson.videoAsset.status === "READY" ? "success" : "warning"
                }
              >
                {lesson.videoAsset.status}
              </Badge>
            ) : (
              <Badge size="sm" variant="warning">
                ไม่มี VDO
              </Badge>
            )}
            <span className="font-mono text-xs text-ink-muted">
              {formatSeconds(lesson.durationSeconds)}
            </span>
          </div>
        </div>
      </form>

      {/* Full edit form: VDO + flags + advanced */}
      <details className="rounded-lg border border-dashed border-line bg-surface-soft/60 px-3 py-2">
        <summary className="cursor-pointer text-xs font-bold text-primary-700">
          แก้รายละเอียดบทเรียน
        </summary>
        <form action={updateLessonAction} className="mt-3 grid gap-3">
          <input name="courseId" type="hidden" value={courseId} />
          <input name="lessonId" type="hidden" value={lesson.id} />
          <input name="title" type="hidden" value={lesson.title} />
          <input
            name="sortOrder"
            type="hidden"
            value={lesson.sortOrder}
          />
          <div className="grid gap-3 md:grid-cols-[1fr_120px]">
            <VideoAssetPicker
              defaultLabel={lesson.videoAsset?.title ?? null}
              defaultStatus={lesson.videoAsset?.status ?? null}
              onChange={setVideoAssetId}
              value={videoAssetId}
            />
            <Input
              defaultValue={lesson.durationSeconds ?? ""}
              label="วินาที"
              min="0"
              name="durationSeconds"
              size="sm"
              type="number"
            />
          </div>
          <Textarea
            defaultValue={lesson.description ?? ""}
            label="คำอธิบาย"
            name="description"
            rows={3}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4">
              <CheckboxLabel
                compact
                defaultChecked={lesson.isPreview}
                label="ตัวอย่าง"
                name="isPreview"
              />
              <CheckboxLabel
                compact
                defaultChecked={lesson.isPublished}
                label="เผยแพร่"
                name="isPublished"
              />
            </div>
            <Button size="sm" type="submit" variant="outline">
              บันทึก
            </Button>
          </div>
        </form>
      </details>

      {/* Pay Time settings - preserve exactly the same FormData contract */}
      <details className="rounded-lg border border-dashed border-line bg-surface-soft/60 px-3 py-2">
        <summary className="cursor-pointer text-xs font-bold text-primary-700">
          ตั้งค่า Pay Time (ขยายเวลาดู VDO)
          {lesson.payTimeEnabled ? (
            <span className="ml-2 inline-flex">
              <Badge size="sm" variant="success">
                เปิดอยู่
              </Badge>
            </span>
          ) : (
            <span className="ml-2 inline-flex">
              <Badge size="sm" variant="neutral">
                ปิดอยู่
              </Badge>
            </span>
          )}
        </summary>
        <form
          action={updateLessonPayTimeConfigAction}
          className="mt-3 grid gap-3"
        >
          <input name="lessonId" type="hidden" value={lesson.id} />
          <p className="text-xs text-ink-muted">
            Pay Time ให้นักเรียนจ่ายเพื่อขยายเวลาดู VDO เฉพาะบทเรียนนี้
            ระบบจะตรวจสลิปก่อนเปิดสิทธิ์
          </p>
          <div className="grid gap-3 md:grid-cols-[auto_1fr_1fr]">
            <label className="inline-flex items-end gap-2 text-sm font-bold text-ink">
              <input
                className="h-4 w-4 rounded border-line text-primary"
                defaultChecked={lesson.payTimeEnabled}
                name="payTimeEnabled"
                type="checkbox"
                value="true"
              />
              <span className="text-xs">เปิดใช้งาน</span>
            </label>
            <Input
              defaultValue={formatThaiBahtFromCents(lesson.payTimePriceCents)}
              label="ราคา (บาท)"
              min="0"
              name="payTimePrice"
              size="sm"
              step="1"
              type="number"
            />
            <Input
              defaultValue={lesson.payTimeHours}
              hint="1 - 720 ชั่วโมง"
              label="ระยะเวลา (ชั่วโมง)"
              max="720"
              min="1"
              name="payTimeHours"
              size="sm"
              step="1"
              type="number"
            />
          </div>
          <Textarea
            defaultValue={lesson.payTimeDescription ?? ""}
            label="คำอธิบายสำหรับนักเรียน (ไม่บังคับ)"
            name="payTimeDescription"
            placeholder="เช่น ขยายเวลาดู VDO ได้ 24 ชั่วโมง"
            rows={2}
          />
          <div className="flex justify-end">
            <Button size="sm" type="submit">
              บันทึก Pay Time
            </Button>
          </div>
        </form>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline composer (collapsed "+ เพิ่มบทเรียน" -> expands into a single row)
// ---------------------------------------------------------------------------

type InlineLessonComposerProps = {
  autoOpen: boolean;
  chapterId: string;
  courseId: string;
  nextSortOrder: number;
};

function InlineLessonComposer({
  autoOpen,
  chapterId,
  courseId,
  nextSortOrder,
}: InlineLessonComposerProps) {
  const [open, setOpen] = useState(autoOpen);
  const [videoAssetId, setVideoAssetId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  // Tracks whether the title was set programmatically (auto-fill from
  // upload) so we know it is safe to overwrite if the user uploads a
  // different file before typing. Once the user types, this flips false
  // and we never overwrite again.
  const titleAutofilledRef = useRef(false);
  // Bumped whenever an upload auto-selects an asset, so the scroll-into-view
  // effect re-runs even if the assetId happens to repeat.
  const [scrollKey, setScrollKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  // Auto-scroll the composer into view after an upload assigns an asset.
  useEffect(() => {
    if (!open) return;
    if (scrollKey === 0) return;
    const node = formRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [open, scrollKey]);

  function handlePickerChange(
    assetId: string | null,
    asset?: VideoAssetPickerOption | null,
  ) {
    setVideoAssetId(assetId);
    // Only auto-fill the title when the picker hands us a fresh asset
    // (upload or list selection) AND the title field is currently empty
    // (or was previously auto-filled and never edited by the user). This
    // guarantees we never overwrite a user-typed title.
    if (asset && (title.trim() === "" || titleAutofilledRef.current)) {
      setTitle(asset.title);
      titleAutofilledRef.current = true;
    }
    // Trigger the scroll-into-view effect whenever a new asset is wired
    // up. We can't tell from props alone whether it came from the upload
    // sub-view, but scrolling the composer into view on any selection is
    // harmless and helpful when the composer sits below the fold.
    if (asset) {
      setScrollKey((prev) => prev + 1);
    }
  }

  function handleTitleChange(next: string) {
    setTitle(next);
    // The moment the user touches the title field manually, future
    // uploads must not overwrite it.
    titleAutofilledRef.current = false;
  }

  if (!open) {
    return (
      <button
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface-soft px-4 py-3 text-sm font-bold text-primary-700 transition",
          "hover:border-primary-300 hover:bg-primary-50",
        )}
        onClick={() => setOpen(true)}
        type="button"
      >
        <span aria-hidden="true">+</span>
        เพิ่มบทเรียน
      </button>
    );
  }

  function handleSubmit(_event: FormEvent<HTMLFormElement>) {
    // Server action will redirect + revalidate. Collapse the composer so
    // the next render shows the freshly-added lesson cleanly.
    setOpen(false);
    setVideoAssetId(null);
    setTitle("");
    titleAutofilledRef.current = false;
  }

  const ready = videoAssetId !== null && title.trim().length > 0;

  return (
    <form
      action={createLessonAction}
      className={cn(
        "grid gap-3 rounded-2xl border border-primary-100 bg-primary-50/30 px-3 py-3 shadow-sm",
        "animate-[fadeIn_0.18s_ease-out]",
      )}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <input name="courseId" type="hidden" value={courseId} />
      <input name="chapterId" type="hidden" value={chapterId} />
      <input name="sortOrder" type="hidden" value={nextSortOrder} />

      <div className="grid gap-3 md:grid-cols-[1fr_260px]">
        <Input
          autoFocus
          label="ชื่อ Lesson"
          name="title"
          onChange={(event) => handleTitleChange(event.target.value)}
          placeholder="เช่น แนะนำคอร์ส"
          required
          size="sm"
          value={title}
        />
        <VideoAssetPicker
          onChange={handlePickerChange}
          value={videoAssetId}
        />
      </div>

      <details className="rounded-lg border border-dashed border-line bg-surface px-3 py-2">
        <summary className="cursor-pointer text-xs font-bold text-primary-700">
          ตัวเลือกเพิ่มเติม
        </summary>
        <div className="mt-3 grid gap-3">
          <div className="grid gap-3 md:grid-cols-[120px_120px]">
            <Input
              defaultValue={nextSortOrder}
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
          </div>
          <Textarea label="คำอธิบาย" name="description" rows={3} />
        </div>
      </details>

      {ready ? (
        <p
          aria-live="polite"
          className="rounded-lg bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700"
        >
          พร้อมเพิ่มบทเรียน — กด &quot;เพิ่ม&quot; ด้านล่าง
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          <CheckboxLabel compact label="เผยแพร่" name="isPublished" />
          <CheckboxLabel compact label="ตัวอย่าง" name="isPreview" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setOpen(false)}
            size="sm"
            type="button"
            variant="outline"
          >
            ยกเลิก
          </Button>
          <Button
            className={cn(
              "transition",
              ready && "ring-2 ring-primary-200",
            )}
            size="sm"
            type="submit"
          >
            เพิ่ม
          </Button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Local checkbox helper (mirrors the server-side helper signature used today)
// ---------------------------------------------------------------------------

type CheckboxLabelProps = {
  name: string;
  label: string;
  defaultChecked?: boolean;
  compact?: boolean;
};

function CheckboxLabel({
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
