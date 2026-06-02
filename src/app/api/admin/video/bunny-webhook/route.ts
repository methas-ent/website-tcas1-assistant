import { NextResponse, type NextRequest } from "next/server";
import { syncBunnyVideoStatusByGuid } from "@/lib/video/bunny-sync";

export const runtime = "nodejs";

type BunnyWebhookBody = {
  VideoGuid?: unknown;
  videoGuid?: unknown;
};

/**
 * Bunny Stream encoding webhook. Bunny posts `{ VideoLibraryId, VideoGuid, Status }`
 * when a video changes encoding state. We ignore the reported Status and instead
 * re-fetch the authoritative status from the Stream API (see syncBunnyVideoStatusByGuid),
 * so a spoofed callback cannot promote an asset to READY.
 *
 * Optional shared secret: if BUNNY_STREAM_WEBHOOK_SECRET is set, requests must
 * include `?secret=<value>`.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.BUNNY_STREAM_WEBHOOK_SECRET?.trim();

  if (expectedSecret) {
    const provided = request.nextUrl.searchParams.get("secret");
    if (provided !== expectedSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: BunnyWebhookBody;

  try {
    body = (await request.json()) as BunnyWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const videoGuid =
    typeof body.VideoGuid === "string"
      ? body.VideoGuid
      : typeof body.videoGuid === "string"
        ? body.videoGuid
        : "";

  if (!videoGuid) {
    return NextResponse.json({ error: "Missing VideoGuid" }, { status: 400 });
  }

  const result = await syncBunnyVideoStatusByGuid(videoGuid);

  if (!result.ok) {
    // 200 for NOT_FOUND so Bunny does not retry a guid we don't own.
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: result.reason === "ERROR" ? 502 : 200 },
    );
  }

  return NextResponse.json({ ok: true, status: result.status });
}
