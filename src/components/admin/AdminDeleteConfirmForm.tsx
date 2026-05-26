"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type AdminDeleteConfirmFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFieldName: string;
  hiddenFieldValue: string;
  itemTitle: string;
  confirmFieldName?: string;
  confirmFieldValue?: string;
};

export function AdminDeleteConfirmForm({
  action,
  hiddenFieldName,
  hiddenFieldValue,
  itemTitle,
  confirmFieldName,
  confirmFieldValue,
}: AdminDeleteConfirmFormProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        onClick={() => setConfirming(true)}
        size="sm"
        type="button"
        variant="danger"
      >
        ลบ
      </Button>
    );
  }

  return (
    <form action={action} className="grid min-w-[220px] gap-2 text-left">
      <input name={hiddenFieldName} type="hidden" value={hiddenFieldValue} />
      {confirmFieldName && confirmFieldValue ? (
        <input name={confirmFieldName} type="hidden" value={confirmFieldValue} />
      ) : null}
      <div className="rounded-card border border-danger/20 bg-danger-soft p-3">
        <p className="text-xs font-bold text-danger">ยืนยันการลบ</p>
        <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{itemTitle}</p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          onClick={() => setConfirming(false)}
          size="sm"
          type="button"
          variant="outline"
        >
          ยกเลิก
        </Button>
        <Button size="sm" type="submit" variant="danger">
          ยืนยันลบ
        </Button>
      </div>
    </form>
  );
}
