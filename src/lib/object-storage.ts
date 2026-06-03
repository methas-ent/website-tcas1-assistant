import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Server-only Cloudflare R2 (S3-compatible) object storage wrapper.
 * R2 is auto-detected from env (see `getR2Config`); when not configured the
 * helpers degrade gracefully so callers can fall back to LOCAL disk.
 */

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string | null;
};

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  const rawPublicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();
  const publicBaseUrl = rawPublicBaseUrl
    ? rawPublicBaseUrl.replace(/\/+$/, "")
    : null;

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
  };
}

export function isR2Enabled(): boolean {
  return getR2Config() !== null;
}

let cachedClient: S3Client | null = null;

function getClient(config: R2Config): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const config = getR2Config();

  if (!config) {
    throw new Error("r2-not-configured");
  }

  const client = getClient(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObject(key: string): Promise<Buffer | null> {
  const config = getR2Config();

  if (!config) {
    return null;
  }

  try {
    const client = getClient(config);
    const res = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );

    if (!res.Body) {
      return null;
    }

    const bytes = await res.Body.transformToByteArray();

    return Buffer.from(bytes);
  } catch {
    return null;
  }
}

export function publicUrlForKey(key: string): string | null {
  const config = getR2Config();

  if (!config?.publicBaseUrl) {
    return null;
  }

  const encodedKey = key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${config.publicBaseUrl}/${encodedKey}`;
}
