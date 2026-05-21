"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";

export type LessonLaunchButtonProps = {
  lessonId: string;
  title: string;
  description?: string | null;
  durationLabel: string;
  episodeLabel: string;
  completed?: boolean;
  locked?: boolean;
};

export function LessonLaunchButton({
  lessonId,
  title,
  description,
  durationLabel,
  episodeLabel,
  completed,
  locked,
}: LessonLaunchButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const playerHref = `/student/lessons/${lessonId}`;

  function openPlayer() {
    setOpen(false);
    router.push(playerHref);
  }

  return (
    <>
      <article
        className={cn(
          "rounded-2xl border bg-surface p-4 shadow-sm transition",
          locked
            ? "border-line opacity-70"
            : "border-primary-100 hover:border-primary-200 hover:shadow-card",
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-50 text-sm font-black text-primary-700">
              {episodeLabel}
            </span>
            <div className="min-w-0">
              <h3 className="font-heading text-base font-bold text-ink">{title}</h3>
              {description ? (
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">
                  {description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="neutral">{durationLabel}</Badge>
                {locked ? (
                  <Badge variant="warning">ล็อก</Badge>
                ) : completed ? (
                  <Badge variant="success">เรียนจบแล้ว</Badge>
                ) : (
                  <Badge variant="primary">ปลดล็อกแล้ว</Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            disabled={locked}
            onClick={() => setOpen(true)}
            type="button"
            variant={completed ? "outline" : "primary"}
          >
            {completed ? "ทบทวน" : "เข้าเรียน"}
          </Button>
        </div>
      </article>

      <Dialog
        closeLabel="Cancel"
        description="เลือกตำแหน่งเล่นวิดีโอสำหรับบทเรียนนี้"
        open={open}
        onOpenChange={setOpen}
        title="เลือกวิธีเล่นวิดีโอ"
        footer={
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        }
      >
        <div className="grid gap-3">
          <Button type="button" fullWidth onClick={openPlayer}>
            Play on Computer
          </Button>
          <Button type="button" fullWidth variant="outline" onClick={openPlayer}>
            Play on Cloud
          </Button>
        </div>
      </Dialog>
    </>
  );
}
