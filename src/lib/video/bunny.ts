import { createHash } from "node:crypto";

/**
 * Bunny.net Stream integration.
 *
 * Two distinct credentials are involved:
 * - `BUNNY_STREAM_API_KEY` + `BUNNY_STREAM_LIBRARY_ID`: server-only key used to
 *   create/upload/query videos via the Stream API (never sent to clients).
 * - `BUNNY_STREAM_TOKEN_KEY`: the pull-zone "URL Token Authentication" key used to
 *   sign short-lived playback URLs. Also server-only.
 *
 * `BUNNY_STREAM_PULLZONE` is the CDN hostname (e.g. "vz-xxxx.b-cdn.net") that serves
 * the HLS manifest + segments for the configured Stream library.
 */

const STREAM_API_BASE = "https://video.bunnycdn.com";
const HLS_MANIFEST_FILE = "playlist.m3u8";

export const BUNNY_HLS_MIME_TYPE = "application/vnd.apple.mpegurl";

export type BunnyConfig = {
  libraryId: string;
  apiKey: string;
  pullZone: string;
  tokenKey: string;
};

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function getBunnyConfig(): BunnyConfig | null {
  const libraryId = readEnv("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = readEnv("BUNNY_STREAM_API_KEY");
  const pullZone = readEnv("BUNNY_STREAM_PULLZONE");
  const tokenKey = readEnv("BUNNY_STREAM_TOKEN_KEY");

  if (!libraryId || !apiKey || !pullZone || !tokenKey) {
    return null;
  }

  // Accept either a bare host ("vz-x.b-cdn.net") or a full URL.
  const host = pullZone.replace(/^https?:\/\//i, "").replace(/\/+$/, "");

  return { libraryId, apiKey, pullZone: host, tokenKey };
}

function requireBunnyConfig(): BunnyConfig {
  const config = getBunnyConfig();

  if (!config) {
    throw new Error(
      "Bunny Stream is not configured. Set BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY, BUNNY_STREAM_PULLZONE and BUNNY_STREAM_TOKEN_KEY.",
    );
  }

  return config;
}

function toUrlSafeBase64(value: Buffer) {
  return value
    .toString("base64")
    .replace(/\n/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/**
 * Build a short-lived signed HLS URL using Bunny's directory ("token_path") URL
 * token authentication. A directory token covers the whole `/{videoGuid}/` prefix
 * so the manifest *and* every `.ts`/rendition segment underneath it is authorized
 * by one token — required for HLS playback.
 *
 * Reference: Bunny URL Token Authentication (path-based).
 */
export function signBunnyHlsUrl(input: {
  videoGuid: string;
  expiresInSeconds: number;
  /** Optional client IP to bind the token to (defense in depth). */
  ip?: string;
}): { url: string; expiresAt: string } {
  const { pullZone, tokenKey } = requireBunnyConfig();
  const expires = Math.floor(Date.now() / 1000) + input.expiresInSeconds;
  const tokenPath = `/${input.videoGuid}/`;

  // hashableBase = securityKey + signedPath + expires (+ optional ip)
  const hashableBase = `${tokenKey}${tokenPath}${expires}${input.ip ?? ""}`;
  const token = toUrlSafeBase64(
    createHash("sha256").update(hashableBase).digest(),
  );

  // `ip` (when supplied) is part of the hash only — Bunny re-derives it from the
  // request, so it must NOT be added to the query string.
  const params = new URLSearchParams({
    token,
    expires: String(expires),
    token_path: tokenPath,
  });

  const url = `https://${pullZone}/${input.videoGuid}/${HLS_MANIFEST_FILE}?${params.toString()}`;

  return { url, expiresAt: new Date(expires * 1000).toISOString() };
}

type BunnyVideoResponse = {
  guid: string;
  status: number;
  encodeProgress?: number;
};

async function streamApiFetch(path: string, init: RequestInit = {}) {
  const { libraryId, apiKey } = requireBunnyConfig();
  const headers = new Headers(init.headers);
  headers.set("AccessKey", apiKey);
  headers.set("accept", "application/json");

  const response = await fetch(`${STREAM_API_BASE}/library/${libraryId}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Bunny Stream API ${init.method ?? "GET"} ${path} failed: ${response.status} ${detail}`.trim(),
    );
  }

  return response;
}

/** Create a Stream video object and return its GUID (no bytes uploaded yet). */
export async function createBunnyVideo(title: string): Promise<string> {
  const response = await streamApiFetch("/videos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });

  const data = (await response.json()) as BunnyVideoResponse;

  if (!data.guid) {
    throw new Error("Bunny Stream did not return a video GUID.");
  }

  return data.guid;
}

/** Upload the raw video bytes for a previously created GUID. */
export async function uploadBunnyVideo(
  videoGuid: string,
  bytes: ArrayBuffer,
): Promise<void> {
  await streamApiFetch(`/videos/${encodeURIComponent(videoGuid)}`, {
    method: "PUT",
    headers: { "content-type": "application/octet-stream" },
    body: bytes,
  });
}

export type BunnyAssetStatus = "PROCESSING" | "READY" | "FAILED";

/**
 * Map Bunny's numeric video status to our VideoAsset.status vocabulary.
 * Bunny: 0 Created, 1 Uploaded, 2 Processing, 3 Transcoding, 4 Finished,
 * 5 Error, 6 UploadFailed.
 */
export function mapBunnyStatus(status: number): BunnyAssetStatus {
  if (status === 4) {
    return "READY";
  }

  if (status === 5 || status === 6) {
    return "FAILED";
  }

  return "PROCESSING";
}

/** Fetch the authoritative status for a Stream video. */
export async function getBunnyVideoStatus(
  videoGuid: string,
): Promise<BunnyAssetStatus> {
  const response = await streamApiFetch(
    `/videos/${encodeURIComponent(videoGuid)}`,
  );
  const data = (await response.json()) as BunnyVideoResponse;

  return mapBunnyStatus(data.status);
}
