import prisma from "@/lib/db";
import {
  getBunnyConfig,
  getBunnyVideoStatus,
  type BunnyAssetStatus,
} from "@/lib/video/bunny";

export type BunnySyncResult =
  | { ok: true; videoAssetId: string; status: BunnyAssetStatus }
  | { ok: false; reason: "NOT_FOUND" | "ERROR" };

/**
 * Reconcile a Bunny-backed VideoAsset's status against Bunny's authoritative
 * value. Called from the webhook and as a lazy poll. We always re-fetch the
 * status from Bunny (never trust the webhook body) so a forged callback cannot
 * flip an asset to READY on its own.
 */
export async function syncBunnyVideoStatusByGuid(
  videoGuid: string,
): Promise<BunnySyncResult> {
  const asset = await prisma.videoAsset.findFirst({
    where: { storageProvider: "BUNNY", storageKey: videoGuid },
    select: { id: true, status: true },
  });

  if (!asset) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  try {
    const status = await getBunnyVideoStatus(videoGuid);

    if (status !== asset.status) {
      await prisma.videoAsset.update({
        where: { id: asset.id },
        data: { status },
      });
    }

    return { ok: true, videoAssetId: asset.id, status };
  } catch (error) {
    console.error("[bunny-sync] failed", {
      videoGuid,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, reason: "ERROR" };
  }
}

/**
 * Lazy poll: reconcile any still-PROCESSING Bunny assets. Used as a fallback for
 * local dev where Bunny cannot reach the public webhook. No-op when Bunny is
 * unconfigured; bounded so an admin page load never fans out unboundedly.
 */
export async function syncPendingBunnyVideos(limit = 20): Promise<void> {
  if (!getBunnyConfig()) {
    return;
  }

  const pending = await prisma.videoAsset.findMany({
    where: { storageProvider: "BUNNY", status: "PROCESSING" },
    select: { storageKey: true },
    take: limit,
  });

  await Promise.all(
    pending.map((video) => syncBunnyVideoStatusByGuid(video.storageKey)),
  );
}
