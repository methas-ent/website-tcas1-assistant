import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export type StoredCoverImage = {
  storageKey: string;
  publicUrl: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

const COVER_IMAGE_MIME_TYPE = "image/png";

export function getCoverImageMaxBytes() {
  const configured = Number.parseInt(
    process.env.COVER_IMAGE_MAX_BYTES ?? "",
    10,
  );

  return Number.isFinite(configured) && configured > 0
    ? configured
    : 5 * 1024 * 1024;
}

function assertValidCoverImageFile(file: File) {
  if (!file || file.size <= 0) {
    throw new Error("invalid");
  }

  if (file.type !== COVER_IMAGE_MIME_TYPE) {
    throw new Error("type");
  }

  if (file.size > getCoverImageMaxBytes()) {
    throw new Error("size");
  }
}

function localCoverStorageRoot() {
  const configured = process.env.LOCAL_COVER_IMAGE_STORAGE_DIR?.trim();
  const root = configured
    ? path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured)
    : path.join(process.cwd(), ".local", "uploads", "covers");
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
    throw new Error("cover-image-storage-must-not-be-public");
  }

  return resolvedRoot;
}

function coverImagePublicUrl(storageKey: string) {
  const encodedKey = storageKey
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/media/covers/${encodedKey}`;
}

export function resolveLocalCoverImagePath(storageKey: string) {
  const normalizedKey = storageKey.replace(/\\/g, "/");
  const root = path.resolve(localCoverStorageRoot());
  const target = path.resolve(
    root,
    ...normalizedKey.split("/").filter(Boolean),
  );

  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error("invalid-cover-image-key");
  }

  return target;
}

export async function saveCoverImage(file: File): Promise<StoredCoverImage> {
  assertValidCoverImageFile(file);

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const storageKey = [year, month, `${randomUUID()}.png`].join("/");
  const targetPath = resolveLocalCoverImagePath(storageKey);
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, bytes);

  return {
    storageKey,
    publicUrl: coverImagePublicUrl(storageKey),
    originalFileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}
