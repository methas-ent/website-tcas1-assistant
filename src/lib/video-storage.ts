import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  BUNNY_HLS_MIME_TYPE,
  createBunnyVideo,
  getBunnyConfig,
  uploadBunnyVideo,
} from "@/lib/video/bunny";

export type StorageProviderName = "LOCAL" | "BUNNY" | "S3" | "R2" | "CLOUD";

/** VideoAsset.status values a provider may request right after saving. */
export type StoredVideoStatus = "UPLOADED" | "PROCESSING" | "READY" | "FAILED";

export type StoredVideoObject = {
  storageProvider: StorageProviderName;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: bigint;
  /**
   * Status the asset should be created with. LOCAL is immediately READY;
   * cloud providers that transcode asynchronously (BUNNY) start at PROCESSING.
   */
  status: StoredVideoStatus;
};

export type StorageProvider = {
  provider: StorageProviderName;
  saveVideo(file: File): Promise<StoredVideoObject>;
};

const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/mpeg",
]);

export function getVideoUploadMaxBytes() {
  const configured = Number.parseInt(
    process.env.VIDEO_UPLOAD_MAX_BYTES ?? "",
    10,
  );

  return Number.isFinite(configured) && configured > 0
    ? configured
    : 500 * 1024 * 1024;
}

/**
 * Hard cap for LOCAL uploads. LOCAL buffers the whole file in memory inside a
 * Server Action and writes it to the (ephemeral) container disk — large files
 * OOM small Railway instances and the request dies with the UI stuck on
 * "saving". Keep LOCAL small; use BUNNY for real/large videos. Default 50 MB.
 */
export function getLocalVideoMaxBytes() {
  const configured = Number.parseInt(
    process.env.LOCAL_VIDEO_MAX_BYTES ?? "",
    10,
  );

  return Number.isFinite(configured) && configured > 0
    ? configured
    : 50 * 1024 * 1024;
}

/**
 * The size limit that should actually be advertised to the uploader, given the
 * active provider. LOCAL is capped tighter so the browser rejects oversized
 * files BEFORE uploading (no server round-trip, no OOM, clear message).
 */
export function getEffectiveVideoUploadMaxBytes() {
  const provider = (process.env.VIDEO_STORAGE_PROVIDER ?? "LOCAL")
    .trim()
    .toUpperCase();

  if (provider === "LOCAL") {
    return Math.min(getVideoUploadMaxBytes(), getLocalVideoMaxBytes());
  }

  return getVideoUploadMaxBytes();
}

export function getVideoUploadErrorMessage(error?: string) {
  const messages: Record<string, string> = {
    invalid: "กรุณาเลือกหมวดวิชา คอร์ส ชื่อวิดีโอ และไฟล์วิดีโอให้ครบ",
    "invalid-selection": "หมวดวิชา คอร์ส chapter หรือ lesson ไม่ตรงกัน",
    type: "รองรับเฉพาะไฟล์วิดีโอสำหรับ development upload",
    size: "ไฟล์มีขนาดใหญ่เกินกว่าที่ตั้งค่าไว้",
    storage: "บันทึกไฟล์วิดีโอไม่สำเร็จ",
    "cannot-change-attached":
      "วิดีโอที่ผูกกับ lesson แล้วต้องคงสถานะ Ready เพื่อไม่ให้บทเรียนที่เปิดใช้งานเสีย",
    "cannot-delete-attached": "ลบวิดีโอไม่ได้ เพราะยังผูกกับ lesson ที่เปิดใช้งานอยู่",
    "confirm-required": "กรุณากดยืนยันการลบวิดีโออีกครั้ง",
  };

  return error ? messages[error] ?? "อัปโหลดวิดีโอไม่สำเร็จ" : null;
}

export function assertValidVideoFile(file: File) {
  if (!file || file.size <= 0) {
    throw new Error("invalid");
  }

  if (!ALLOWED_VIDEO_MIME_TYPES.has(file.type)) {
    throw new Error("type");
  }

  if (file.size > getVideoUploadMaxBytes()) {
    throw new Error("size");
  }
}

function safeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return /^[a-z0-9.]+$/.test(extension) ? extension : ".bin";
}

function localStorageRoot() {
  const configured = process.env.LOCAL_VIDEO_STORAGE_DIR?.trim();

  const root = configured
    ? path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured)
    : path.join(process.cwd(), ".local", "uploads", "videos");
  const resolvedRoot = path.resolve(root);
  const workspace = path.resolve(process.cwd());
  const disallowedRoots = [
    path.join(workspace, "public"),
    path.join(workspace, "src"),
    path.join(workspace, "app"),
    path.join(workspace, "pages"),
  ].map((item) => path.resolve(item));

  if (
    disallowedRoots.some(
      (disallowedRoot) =>
        resolvedRoot === disallowedRoot ||
        resolvedRoot.startsWith(`${disallowedRoot}${path.sep}`),
    )
  ) {
    throw new Error("local-video-storage-must-not-be-public");
  }

  return resolvedRoot;
}

export function resolveLocalVideoPath(storageKey: string) {
  const normalizedKey = storageKey.replace(/\\/g, "/");
  const root = path.resolve(localStorageRoot());
  const target = path.resolve(
    root,
    ...normalizedKey.split("/").filter(Boolean),
  );

  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error("invalid-storage-key");
  }

  return target;
}

export class LocalVideoStorageProvider implements StorageProvider {
  provider = "LOCAL" as const;

  async saveVideo(file: File): Promise<StoredVideoObject> {
    assertValidVideoFile(file);

    // Fail fast (defense in depth alongside the client cap) so a large file
    // never gets buffered into memory + written to ephemeral disk on Railway.
    const localMax = getLocalVideoMaxBytes();
    if (file.size > localMax) {
      console.error("[video-upload] local file exceeds cap", {
        sizeBytes: file.size,
        limitBytes: localMax,
      });
      throw new Error("local-too-large");
    }

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const storageKey = [year, month, `${randomUUID()}${safeExtension(file.name)}`].join("/");
    const targetPath = path.join(localStorageRoot(), storageKey);

    console.info("[video-upload] local write start", {
      storageKey,
      sizeBytes: file.size,
    });

    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, bytes);
    } catch (error) {
      console.error("[video-upload] local write failed", {
        storageKey,
        message: error instanceof Error ? error.message : "unknown",
      });
      throw new Error("storage");
    }

    console.info("[video-upload] local write ok", { storageKey });

    return {
      storageProvider: this.provider,
      storageKey,
      originalFileName: file.name,
      mimeType: file.type,
      sizeBytes: BigInt(file.size),
      status: "READY",
    };
  }
}

/**
 * Uploads to Bunny Stream. Bunny transcodes asynchronously, so the asset is
 * created as PROCESSING and flipped to READY by the webhook / status sync once
 * encoding finishes. `storageKey` holds the Bunny video GUID (never a raw URL).
 */
export class BunnyVideoStorageProvider implements StorageProvider {
  provider = "BUNNY" as const;

  async saveVideo(file: File): Promise<StoredVideoObject> {
    assertValidVideoFile(file);

    console.info("[video-upload] bunny upload start", { sizeBytes: file.size });
    let videoGuid: string;
    try {
      videoGuid = await createBunnyVideo(file.name || "video");
      await uploadBunnyVideo(videoGuid, await file.arrayBuffer());
    } catch (error) {
      console.error("[video-upload] bunny upload failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
      throw new Error("storage");
    }
    console.info("[video-upload] bunny upload ok", { videoGuid });

    return {
      storageProvider: this.provider,
      storageKey: videoGuid,
      originalFileName: file.name,
      // Playback is HLS regardless of the source container.
      mimeType: BUNNY_HLS_MIME_TYPE,
      sizeBytes: BigInt(file.size),
      status: "PROCESSING",
    };
  }
}

export class PlaceholderCloudStorageProvider implements StorageProvider {
  constructor(public provider: Exclude<StorageProviderName, "LOCAL" | "BUNNY">) {}

  async saveVideo(): Promise<StoredVideoObject> {
    throw new Error(`${this.provider} storage is planned but not implemented yet.`);
  }
}

/**
 * Selects the active upload provider from `VIDEO_STORAGE_PROVIDER`
 * (default LOCAL). BUNNY requires the Bunny Stream env vars to be set.
 */
export function getVideoStorageProvider(): StorageProvider {
  const configured = (process.env.VIDEO_STORAGE_PROVIDER ?? "LOCAL")
    .trim()
    .toUpperCase();

  if (configured === "BUNNY") {
    if (!getBunnyConfig()) {
      throw new Error(
        "VIDEO_STORAGE_PROVIDER=BUNNY but Bunny Stream env vars are missing.",
      );
    }

    return new BunnyVideoStorageProvider();
  }

  return new LocalVideoStorageProvider();
}
