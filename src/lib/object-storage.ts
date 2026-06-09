import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Server-only Cloudflare R2 (S3-compatible) object storage wrapper.
 *
 * Production uses two separate buckets for security isolation:
 *   - covers: PUBLIC bucket for course/package cover images
 *     (R2_COVERS_BUCKET_NAME + R2_COVERS_PUBLIC_BASE_URL).
 *   - slips: PRIVATE bucket for payment slips. Never served via a public
 *     URL — admin routes stream bytes through `getSlipObject` (R2_SLIPS_BUCKET_NAME).
 *
 * All three R2 credentials are shared. Each bucket is auto-detected from env;
 * when a bucket is not configured the helpers degrade gracefully so callers
 * can fall back to LOCAL disk.
 */

type R2Credentials = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function getR2Credentials(): R2Credentials | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey };
}

export type R2CoversConfig = R2Credentials & {
  bucket: string;
  publicBaseUrl: string;
};

export function getR2CoversConfig(): R2CoversConfig | null {
  const credentials = getR2Credentials();

  if (!credentials) {
    return null;
  }

  const bucket = process.env.R2_COVERS_BUCKET_NAME?.trim();
  const rawPublicBaseUrl = process.env.R2_COVERS_PUBLIC_BASE_URL?.trim();

  // Covers are public; without a public base URL we cannot build usable URLs,
  // so treat R2 covers as not configured and fall back to LOCAL disk.
  if (!bucket || !rawPublicBaseUrl) {
    return null;
  }

  return {
    ...credentials,
    bucket,
    publicBaseUrl: rawPublicBaseUrl.replace(/\/+$/, ""),
  };
}

export type R2SlipsConfig = R2Credentials & {
  bucket: string;
};

export function getR2SlipsConfig(): R2SlipsConfig | null {
  const credentials = getR2Credentials();

  if (!credentials) {
    return null;
  }

  const bucket = process.env.R2_SLIPS_BUCKET_NAME?.trim();

  if (!bucket) {
    return null;
  }

  return { ...credentials, bucket };
}

export function isR2CoversEnabled(): boolean {
  return getR2CoversConfig() !== null;
}

export function isR2SlipsEnabled(): boolean {
  return getR2SlipsConfig() !== null;
}

let cachedClient: S3Client | null = null;

function getClient(credentials: R2Credentials): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  // Both buckets live in the same R2 account and share credentials, so a
  // single S3 client (keyed on the account endpoint) serves both.
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${credentials.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });

  return cachedClient;
}

function encodeKey(key: string): string {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Upload a cover image to the PUBLIC covers bucket only.
 */
export async function putCoverObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const config = getR2CoversConfig();

  if (!config) {
    throw new Error("r2-covers-not-configured");
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

/**
 * Build the public URL for a cover image key using R2_COVERS_PUBLIC_BASE_URL.
 */
export function coverPublicUrlForKey(key: string): string | null {
  const config = getR2CoversConfig();

  if (!config) {
    return null;
  }

  return `${config.publicBaseUrl}/${encodeKey(key)}`;
}

/**
 * Upload a payment slip to the PRIVATE slips bucket only. Slips are never
 * exposed via a public URL — there is intentionally no slip URL helper.
 */
export async function putSlipObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const config = getR2SlipsConfig();

  if (!config) {
    throw new Error("r2-slips-not-configured");
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

/**
 * Stream a payment slip from the PRIVATE slips bucket. Used by admin-only
 * routes that proxy the bytes; the slip is never served publicly.
 */
export async function getSlipObject(key: string): Promise<Buffer | null> {
  const config = getR2SlipsConfig();

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
