import { NextResponse, type NextRequest } from "next/server";
import { issuePlaybackTokenForSession } from "@/lib/playback-session";

export const runtime = "nodejs";

type PlaybackTokenBody = {
  sessionId?: unknown;
};

export async function POST(request: NextRequest) {
  let body: PlaybackTokenBody;

  try {
    body = (await request.json()) as PlaybackTokenBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const result = await issuePlaybackTokenForSession(sessionId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({
    playbackUrl: result.playbackUrl,
    expiresAt: result.expiresAt,
    sessionId: result.sessionId,
    lessonTitle: result.lessonTitle,
    mimeType: result.mimeType,
  });
}
