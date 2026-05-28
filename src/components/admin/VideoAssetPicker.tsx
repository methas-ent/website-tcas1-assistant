"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  KeyboardEvent,
} from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

export type VideoAssetPickerOption = {
  id: string;
  title: string;
  status: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  originalFileName: string;
  isUsed: boolean;
};

type VideoAssetPickerProps = {
  value: string | null;
  /**
   * Called when the selected asset changes.
   *
   * The second argument is the full asset row when available (after a
   * successful upload or list selection) and `null` when the selection
   * is cleared. Callers may ignore it for backward compat.
   */
  onChange: (
    assetId: string | null,
    asset?: VideoAssetPickerOption | null,
  ) => void;
  defaultLabel?: string | null;
  defaultStatus?: string | null;
  /** Optional: hint for future per-chapter optimization. Unused today. */
  chapterId?: string;
  /** Hidden input name (defaults to `videoAssetId`). */
  name?: string;
  className?: string;
  disabled?: boolean;
};

type FilterMode = "unused" | "all";

type FetchState = {
  loading: boolean;
  error: string | null;
  assets: VideoAssetPickerOption[];
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  if (diff < 60_000) return "เมื่อสักครู่";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} นาทีก่อน`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.ก่อน`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันก่อน`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} เดือนก่อน`;
  return `${Math.floor(months / 12)} ปีก่อน`;
}

function statusBadgeVariant(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "READY") return "success" as const;
  if (normalized === "FAILED") return "danger" as const;
  return "warning" as const;
}

const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  forbidden: "ต้องเข้าสู่ระบบในฐานะผู้ดูแลก่อน",
  "invalid-title": "กรุณากรอกชื่อวิดีโอ",
  "invalid-file": "กรุณาเลือกไฟล์วิดีโอ",
  "invalid-type": "รองรับเฉพาะไฟล์วิดีโอ (MP4, WebM, MOV, M4V, MPEG)",
  "invalid-size": "ไฟล์มีขนาดใหญ่เกินกว่าที่ตั้งค่าไว้",
  storage: "อัปโหลดไม่สำเร็จ กรุณาลองใหม่",
  "invalid-form": "ข้อมูลฟอร์มไม่ถูกต้อง",
};

export function VideoAssetPicker({
  value,
  onChange,
  defaultLabel,
  defaultStatus,
  name = "videoAssetId",
  className,
  disabled,
}: VideoAssetPickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "upload">("list");
  const [filter, setFilter] = useState<FilterMode>("unused");
  const [search, setSearch] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>({
    loading: false,
    error: null,
    assets: [],
  });
  const [highlight, setHighlight] = useState(0);
  const [selectedSnapshot, setSelectedSnapshot] = useState<
    VideoAssetPickerOption | null
  >(null);

  // Upload sub-view state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const fetchSeqRef = useRef(0);
  const listboxId = useId();

  const triggerLabel = useMemo(() => {
    if (selectedSnapshot) return selectedSnapshot.title;
    if (value && defaultLabel) return defaultLabel;
    if (value) return value;
    return "เลือกวิดีโอ";
  }, [defaultLabel, selectedSnapshot, value]);

  const triggerStatus = useMemo(() => {
    if (selectedSnapshot) return selectedSnapshot.status;
    if (value && defaultStatus) return defaultStatus;
    return null;
  }, [defaultStatus, selectedSnapshot, value]);

  const loadList = useCallback(
    async (nextSearch: string, nextFilter: FilterMode) => {
      const seq = fetchSeqRef.current + 1;
      fetchSeqRef.current = seq;
      setFetchState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const params = new URLSearchParams();
        if (nextSearch) params.set("search", nextSearch);
        params.set("unusedOnly", nextFilter === "unused" ? "true" : "false");
        const response = await fetch(
          `/api/admin/video-assets/available?${params.toString()}`,
          { method: "GET", credentials: "same-origin" },
        );

        if (seq !== fetchSeqRef.current) return;

        if (!response.ok) {
          throw new Error(`http-${response.status}`);
        }

        const json = (await response.json()) as {
          assets: VideoAssetPickerOption[];
        };

        if (seq !== fetchSeqRef.current) return;

        setFetchState({
          loading: false,
          error: null,
          assets: Array.isArray(json.assets) ? json.assets : [],
        });
        setHighlight(0);
      } catch (error) {
        if (seq !== fetchSeqRef.current) return;
        setFetchState({
          loading: false,
          error:
            error instanceof Error
              ? "โหลดรายการวิดีโอไม่สำเร็จ"
              : "โหลดรายการวิดีโอไม่สำเร็จ",
          assets: [],
        });
      }
    },
    [],
  );

  // Initial + filter-change loads when panel is open
  useEffect(() => {
    if (!open || mode !== "list") return;
    loadList(search, filter);
  }, [open, mode, filter, loadList, search]);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open && mode === "list") {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
    if (open && mode === "upload") {
      requestAnimationFrame(() => fileRef.current?.focus());
    }
  }, [open, mode]);

  function handleSelect(asset: VideoAssetPickerOption) {
    setSelectedSnapshot(asset);
    onChange(asset.id, asset);
    setOpen(false);
  }

  function handleClear(
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  ) {
    event.stopPropagation();
    if ("preventDefault" in event) {
      event.preventDefault();
    }
    setSelectedSnapshot(null);
    onChange(null, null);
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((prev) =>
        Math.min(prev + 1, Math.max(fetchState.assets.length - 1, 0)),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = fetchState.assets[highlight];
      if (target) handleSelect(target);
    } else if (event.key === "/" && document.activeElement !== searchRef.current) {
      event.preventDefault();
      searchRef.current?.focus();
    }
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setSearch(next);
  }

  // Debounced search re-fetch
  useEffect(() => {
    if (!open || mode !== "list") return;
    const handle = window.setTimeout(() => {
      loadList(search, filter);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [search, open, mode, filter, loadList]);

  async function handleUploadSubmit() {
    setUploadError(null);

    if (uploadBusy) return;

    if (!uploadFile) {
      setUploadError(UPLOAD_ERROR_MESSAGES["invalid-file"] ?? "อัปโหลดไม่สำเร็จ");
      return;
    }

    setUploadBusy(true);

    const fallbackTitle = uploadFile.name.replace(/\.[^.]+$/, "").trim();
    const formData = new FormData();
    formData.append("title", fallbackTitle);
    formData.append("videoFile", uploadFile);

    try {
      const response = await fetch("/api/admin/video-assets/upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      const json = (await response.json().catch(() => null)) as
        | { asset?: VideoAssetPickerOption; error?: string }
        | null;

      if (!response.ok || !json?.asset) {
        const code = json?.error ?? "storage";
        setUploadError(
          UPLOAD_ERROR_MESSAGES[code] ?? "อัปโหลดไม่สำเร็จ กรุณาลองใหม่",
        );
        setUploadBusy(false);
        return;
      }

      // Optimistically prepend + auto-select
      const fresh = json.asset;
      setFetchState((prev) => ({
        ...prev,
        assets: [fresh, ...prev.assets.filter((a) => a.id !== fresh.id)],
      }));
      setSelectedSnapshot(fresh);
      // Pass the full asset so the composer can auto-fill the lesson title
      // and scroll itself into view.
      onChange(fresh.id, fresh);
      setUploadFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setUploadBusy(false);
      setMode("list");
      setOpen(false);
    } catch {
      setUploadError("อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
      setUploadBusy(false);
    }
  }

  return (
    <div className={cn("grid gap-1.5", className)} ref={containerRef}>
      <span className="text-sm font-bold text-ink-soft">VDO</span>
      <div className="relative">
        <button
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-3 text-left text-sm text-ink shadow-sm transition",
            "hover:border-primary-200 focus:border-primary-300 focus:outline-none focus:ring-4 focus:ring-primary-100",
            disabled && "cursor-not-allowed opacity-60",
          )}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
            setMode("list");
          }}
          type="button"
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              !value && !selectedSnapshot && "text-ink-faint",
            )}
          >
            {triggerLabel}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {triggerStatus ? (
              <Badge size="sm" variant={statusBadgeVariant(triggerStatus)}>
                {triggerStatus}
              </Badge>
            ) : null}
            {value || selectedSnapshot ? (
              <span
                aria-label="ล้างวิดีโอที่เลือก"
                className="inline-flex cursor-pointer items-center justify-center rounded-full p-1 text-ink-faint hover:bg-surface-muted hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary-200"
                onClick={handleClear}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    handleClear(event);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="12"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="12"
                >
                  <line x1="18" x2="6" y1="6" y2="18" />
                  <line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </span>
            ) : null}
            <svg
              aria-hidden="true"
              className={cn("transition", open && "rotate-180")}
              fill="none"
              height="14"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="14"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {open ? (
          <div
            className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-raised"
            onKeyDown={handleListKeyDown}
            role="dialog"
          >
            {mode === "list" ? (
              <div className="grid gap-2 p-3">
                <div className="grid gap-2">
                  <input
                    aria-label="ค้นหาวิดีโอ"
                    className={cn(
                      "h-9 w-full rounded-xl border border-line bg-surface-soft px-3 text-sm text-ink shadow-sm",
                      "placeholder:text-ink-faint focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100",
                    )}
                    onChange={handleSearchChange}
                    placeholder="ค้นหาด้วยชื่อ หรือชื่อไฟล์"
                    ref={searchRef}
                    type="search"
                    value={search}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div
                      aria-label="ตัวกรอง"
                      className="inline-flex items-center gap-1 rounded-full bg-surface-muted p-1 text-xs"
                      role="tablist"
                    >
                      <FilterChip
                        active={filter === "unused"}
                        label="ที่ยังไม่ผูก lesson"
                        onClick={() => setFilter("unused")}
                      />
                      <FilterChip
                        active={filter === "all"}
                        label="ทั้งหมด"
                        onClick={() => setFilter("all")}
                      />
                    </div>
                    <button
                      className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 transition hover:bg-primary-100"
                      onClick={() => {
                        setMode("upload");
                        setUploadError(null);
                      }}
                      type="button"
                    >
                      + อัปโหลดวิดีโอใหม่
                    </button>
                  </div>
                </div>

                <ul
                  aria-label="รายการวิดีโอ"
                  className="grid max-h-72 gap-1 overflow-y-auto"
                  id={listboxId}
                  ref={listRef}
                  role="listbox"
                >
                  {fetchState.loading ? (
                    <li className="px-3 py-6 text-center text-xs text-ink-muted">
                      กำลังโหลด...
                    </li>
                  ) : fetchState.error ? (
                    <li className="px-3 py-6 text-center text-xs font-semibold text-danger">
                      {fetchState.error}
                    </li>
                  ) : fetchState.assets.length === 0 ? (
                    <li className="px-3 py-6 text-center text-xs text-ink-muted">
                      ไม่มีวิดีโอที่ยังว่าง ลองสลับเป็น &quot;ทั้งหมด&quot; หรืออัปโหลดใหม่
                    </li>
                  ) : (
                    fetchState.assets.map((asset, index) => (
                      <li key={asset.id}>
                        <button
                          aria-selected={highlight === index}
                          className={cn(
                            "flex w-full items-start gap-2 rounded-xl border border-transparent px-3 py-2 text-left transition",
                            highlight === index
                              ? "border-primary-200 bg-primary-50"
                              : "hover:border-line hover:bg-surface-soft",
                            value === asset.id && "ring-1 ring-primary-300",
                          )}
                          onClick={() => handleSelect(asset)}
                          onMouseEnter={() => setHighlight(index)}
                          role="option"
                          type="button"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-ink">
                              {asset.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-ink-muted">
                              {asset.originalFileName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-ink-faint">
                              {formatBytes(asset.sizeBytes)} ·{" "}
                              {formatRelative(asset.createdAt)}
                              {asset.isUsed ? " · ใช้กับ lesson อื่นแล้ว" : ""}
                            </p>
                          </div>
                          <Badge
                            size="sm"
                            variant={statusBadgeVariant(asset.status)}
                          >
                            {asset.status}
                          </Badge>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : (
              // NOTE: This block is intentionally NOT a <form>. The picker is
              // rendered inside the parent lesson composer's <form>; nested
              // forms are invalid HTML and the browser silently flattens them,
              // which previously caused the "อัปโหลด" submit button to submit
              // the outer composer form (GET ?picker-upload-file=...). We use
              // a plain <div> + explicit type="button" + onClick fetch instead.
              <div className="grid gap-3 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-700">
                    อัปโหลดวิดีโอใหม่
                  </p>
                  <button
                    className="text-xs font-bold text-ink-muted hover:text-ink"
                    onClick={() => {
                      setMode("list");
                      setUploadError(null);
                    }}
                    type="button"
                  >
                    กลับไปยังรายการ
                  </button>
                </div>

                <label className="grid gap-1">
                  <span className="text-xs font-bold text-ink-soft">
                    ไฟล์วิดีโอ
                  </span>
                  <input
                    accept="video/*"
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink shadow-sm"
                    disabled={uploadBusy}
                    onChange={(event) => {
                      const next = event.target.files?.[0] ?? null;
                      setUploadFile(next);
                    }}
                    ref={fileRef}
                    type="file"
                  />
                  <span className="text-[11px] text-ink-muted">
                    รองรับ MP4, WebM, MOV, M4V, MPEG (Dev only) — ใช้ชื่อไฟล์เป็นชื่อวิดีโออัตโนมัติ
                  </span>
                </label>

                {uploadError ? (
                  <p className="rounded-xl bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
                    {uploadError}
                  </p>
                ) : null}

                <div className="flex justify-end gap-2">
                  <Button
                    disabled={uploadBusy}
                    onClick={() => {
                      setMode("list");
                      setUploadError(null);
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    disabled={uploadBusy}
                    onClick={() => {
                      void handleUploadSubmit();
                    }}
                    size="sm"
                    type="button"
                  >
                    {uploadBusy ? "กำลังอัปโหลด..." : "อัปโหลด"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
      <input name={name} type="hidden" value={value ?? ""} />
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={cn(
        "rounded-full px-3 py-1 font-bold transition",
        active
          ? "bg-surface text-primary-700 shadow-sm"
          : "text-ink-muted hover:text-ink",
      )}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
}
