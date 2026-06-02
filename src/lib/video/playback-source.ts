import { createPlaybackToken, getPlaybackTokenTtlSeconds } from "@/lib/secure-playback";
import { BUNNY_HLS_MIME_TYPE, signBunnyHlsUrl } from "@/lib/video/bunny";

/** Mirrors PlaybackKind in @knowledge/shared (kept local so the Next build
 * does not need to transpile the shared workspace package). */
export type PlaybackKind = "hls" | "mp4";

export type PlaybackSourceInput = {
  storageProvider: string;
  storageKey: string;
  mimeType: string;
};

export type ResolvedPlaybackSource = {
  playbackUrl: string;
  playbackKind: PlaybackKind;
  expiresAt: string;
  mimeType: string;
};

/**
 * Turn an authorized lesson's VideoAsset into a short-lived, client-playable
 * source. Provider-pluggable so swapping storage backends never touches the
 * playback routes or the player UI.
 *
 * - LOCAL  → progressive MP4 streamed by our own /api/playback/stream route,
 *            gated by an HMAC playback token (existing behaviour).
 * - BUNNY  → signed HLS manifest served directly from the Bunny CDN.
 */
export function resolvePlaybackSource(
  videoAsset: PlaybackSourceInput,
  context: { sessionId: string; userId: string; lessonId: string; ip?: string },
): ResolvedPlaybackSource {
  if (videoAsset.storageProvider === "BUNNY") {
    const { url, expiresAt } = signBunnyHlsUrl({
      videoGuid: videoAsset.storageKey,
      expiresInSeconds: getPlaybackTokenTtlSeconds(),
      ip: context.ip,
    });

    return {
      playbackUrl: url,
      playbackKind: "hls",
      expiresAt,
      mimeType: BUNNY_HLS_MIME_TYPE,
    };
  }

  // Default: LOCAL progressive stream behind our own token-gated route.
  const { token, expiresAt } = createPlaybackToken({
    sessionId: context.sessionId,
    userId: context.userId,
    lessonId: context.lessonId,
  });

  return {
    playbackUrl: `/api/playback/stream/${encodeURIComponent(token)}`,
    playbackKind: "mp4",
    expiresAt,
    mimeType: videoAsset.mimeType || "video/mp4",
  };
}
