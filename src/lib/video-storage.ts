import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export type StorageProviderName = "LOCAL" | "S3" | "R2" | "CLOUD";

export type StoredVideoObject = {
  storageProvider: StorageProviderName;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: bigint;
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

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const storageKey = [year, month, `${randomUUID()}${safeExtension(file.name)}`].join("/");
    const targetPath = path.join(localStorageRoot(), storageKey);
    const bytes = Buffer.from(await file.arrayBuffer());

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, bytes);

    return {
      storageProvider: this.provider,
      storageKey,
      originalFileName: file.name,
      mimeType: file.type,
      sizeBytes: BigInt(file.size),
    };
  }
}

export class PlaceholderCloudStorageProvider implements StorageProvider {
  constructor(public provider: Exclude<StorageProviderName, "LOCAL">) {}

  async saveVideo(): Promise<StoredVideoObject> {
    throw new Error(`${this.provider} storage is planned but not implemented yet.`);
  }
}

export function getVideoStorageProvider(): StorageProvider {
  return new LocalVideoStorageProvider();
}
