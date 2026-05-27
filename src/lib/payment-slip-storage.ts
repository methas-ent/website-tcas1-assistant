import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export type StoredPaymentSlip = {
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

const ALLOWED_PAYMENT_SLIP_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function getPaymentSlipMaxBytes() {
  const configured = Number.parseInt(
    process.env.PAYMENT_SLIP_MAX_BYTES ?? "",
    10,
  );

  return Number.isFinite(configured) && configured > 0
    ? configured
    : 10 * 1024 * 1024;
}

export function getPaymentSlipErrorMessage(error?: string) {
  const messages: Record<string, string> = {
    invalid: "กรุณาแนบสลิปโอนเงินให้ถูกต้อง",
    type: "รองรับสลิปเป็น JPG, PNG, WebP หรือ PDF เท่านั้น",
    size: "ไฟล์สลิปมีขนาดใหญ่เกินกว่าที่ตั้งค่าไว้",
    storage: "บันทึกไฟล์สลิปไม่สำเร็จ",
  };

  return error ? messages[error] ?? "บันทึกสลิปไม่สำเร็จ" : null;
}

function assertValidPaymentSlipFile(file: File) {
  if (!file || file.size <= 0) {
    throw new Error("invalid");
  }

  if (!ALLOWED_PAYMENT_SLIP_MIME_TYPES.has(file.type)) {
    throw new Error("type");
  }

  if (file.size > getPaymentSlipMaxBytes()) {
    throw new Error("size");
  }
}

function safeExtension(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).toLowerCase();

  if (/^[a-z0-9.]+$/.test(extension)) {
    return extension;
  }

  if (mimeType === "application/pdf") {
    return ".pdf";
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  return ".jpg";
}

function localSlipStorageRoot() {
  const configured = process.env.LOCAL_PAYMENT_SLIP_STORAGE_DIR?.trim();
  const root = configured
    ? path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured)
    : path.join(process.cwd(), ".local", "uploads", "payment-slips");
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
    throw new Error("payment-slip-storage-must-not-be-public");
  }

  return resolvedRoot;
}

export function resolveLocalPaymentSlipPath(storageKey: string) {
  const normalizedKey = storageKey.replace(/\\/g, "/");
  const root = path.resolve(localSlipStorageRoot());
  const target = path.resolve(
    root,
    ...normalizedKey.split("/").filter(Boolean),
  );

  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error("invalid-payment-slip-key");
  }

  return target;
}

export type SavePaymentSlipOptions = {
  /**
   * Optional sub-folder under the slip storage root. Used to keep
   * Pay Time slips (`pay-time`) separated from course-checkout slips.
   * Only `[a-z0-9-]+` segments are allowed; anything else is ignored.
   */
  subfolder?: string;
};

function sanitizeSubfolder(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");

  if (!trimmed) {
    return null;
  }

  const segments = trimmed.split("/").filter(Boolean);

  if (!segments.every((segment) => /^[a-z0-9-]+$/.test(segment))) {
    return null;
  }

  return segments.join("/");
}

export async function savePaymentSlip(
  file: File,
  options: SavePaymentSlipOptions = {},
): Promise<StoredPaymentSlip> {
  assertValidPaymentSlipFile(file);

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const subfolder = sanitizeSubfolder(options.subfolder);
  const keyParts = [
    ...(subfolder ? subfolder.split("/") : []),
    year,
    month,
    `${randomUUID()}${safeExtension(file.name, file.type)}`,
  ];
  const storageKey = keyParts.join("/");
  const targetPath = resolveLocalPaymentSlipPath(storageKey);
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, bytes);

  return {
    storageKey,
    originalFileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}
