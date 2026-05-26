"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type AdminVideoDeleteConfirmFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  videoId: string;
  videoTitle: string;
};

export function AdminVideoDeleteConfirmForm({
  action,
  videoId,
  videoTitle,
}: AdminVideoDeleteConfirmFormProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        onClick={() => setConfirming(true)}
        size="sm"
        type="button"
        variant="danger"
      >
        Delete
      </Button>
    );
  }

  return (
    <form action={action} className="grid min-w-[220px] gap-2 text-left">
      <input name="videoId" type="hidden" value={videoId} />
      <input name="confirmDelete" type="hidden" value="DELETE_VIDEO" />
      <div className="rounded-card border border-danger/20 bg-danger-soft p-3">
        <p className="text-xs font-bold text-danger">Confirm delete</p>
        <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{videoTitle}</p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          onClick={() => setConfirming(false)}
          size="sm"
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button size="sm" type="submit" variant="danger">
          ยืนยันลบ
        </Button>
      </div>
    </form>
  );
}
