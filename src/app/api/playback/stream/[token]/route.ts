import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { authorizePlaybackSession } from "@/lib/playback-session";
import { verifyPlaybackToken } from "@/lib/secure-playback";
import { resolveLocalVideoPath } from "@/lib/video-storage";

export const runtime = "nodejs";

type PlaybackStreamRouteProps = {
  params: {
    token: string;
  };
};

type ByteRange = {
  start: number;
  end: number;
};

function parseRange(rangeHeader: string | null, size: number): ByteRange | null {
  if (!rangeHeader) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);

  if (!match) {
    return null;
  }

  const [, rawStart, rawEnd] = match;

  if (!rawStart && !rawEnd) {
    return null;
  }

  if (!rawStart) {
    const suffixLength = Number.parseInt(rawEnd ?? "", 10);

    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }

    return {
      start: Math.max(size - suffixLength, 0),
      end: size - 1,
    };
  }

  const start = Number.parseInt(rawStart, 10);
  const end = rawEnd ? Number.parseInt(rawEnd, 10) : size - 1;

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return null;
  }

  return {
    start,
    end: Math.min(end, size - 1),
  };
}

function streamBody(filePath: string, range: ByteRange) {
  return Readable.toWeb(
    createReadStream(filePath, { start: range.start, end: range.end }),
  ) as ReadableStream<Uint8Array>;
}

export async function GET(
  request: NextRequest,
  { params }: PlaybackStreamRouteProps,
) {
  const payload = verifyPlaybackToken(params.token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid playback token" }, { status: 401 });
  }

  const user = await getCurrentUserFromRequest(request);
  const sessionAccess = await authorizePlaybackSession(payload.sessionId, user);

  if (!sessionAccess.ok) {
    console.warn("playback.stream.denied", {
      sessionId: payload.sessionId,
      error: sessionAccess.error,
    });

    return NextResponse.json(
      { error: sessionAccess.error },
      { status: sessionAccess.status },
    );
  }

  if (
    payload.userId !== sessionAccess.session.userId ||
    payload.lessonId !== sessionAccess.session.lessonId
  ) {
    console.warn("playback.stream.token_mismatch", {
      sessionId: payload.sessionId,
      tokenLessonId: payload.lessonId,
      sessionLessonId: sessionAccess.session.lessonId,
    });

    return NextResponse.json({ error: "Token mismatch" }, { status: 403 });
  }

  const videoAsset = sessionAccess.access.lesson.videoAsset;

  if (!videoAsset) {
    return NextResponse.json({ error: "Video no longer matches token" }, { status: 403 });
  }

  if (videoAsset.storageProvider !== "LOCAL") {
    return NextResponse.json(
      { error: "Cloud signed playback is not implemented yet" },
      { status: 501 },
    );
  }

  let filePath: string;
  let fileStat: Awaited<ReturnType<typeof stat>>;

  try {
    filePath = resolveLocalVideoPath(videoAsset.storageKey);
    fileStat = await stat(filePath);
  } catch {
    return NextResponse.json({ error: "Video file unavailable" }, { status: 404 });
  }

  if (!fileStat.isFile()) {
    return NextResponse.json({ error: "Video file unavailable" }, { status: 404 });
  }

  const fileSize = fileStat.size;
  const range = parseRange(request.headers.get("range"), fileSize);
  const commonHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": videoAsset.mimeType || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  };

  if (request.headers.get("range") && !range) {
    return new Response(null, {
      status: 416,
      headers: {
        ...commonHeaders,
        "Content-Range": `bytes */${fileSize}`,
      },
    });
  }

  const selectedRange = range ?? { start: 0, end: fileSize - 1 };
  const contentLength = selectedRange.end - selectedRange.start + 1;

  return new Response(streamBody(filePath, selectedRange), {
    status: range ? 206 : 200,
    headers: {
      ...commonHeaders,
      "Content-Length": String(contentLength),
      ...(range
        ? {
            "Content-Range": `bytes ${selectedRange.start}-${selectedRange.end}/${fileSize}`,
          }
        : {}),
    },
  });
}
