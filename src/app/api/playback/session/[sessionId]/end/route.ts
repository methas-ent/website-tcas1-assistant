import { NextResponse } from "next/server";
import { endPlaybackSession } from "@/lib/playback-session";

export const runtime = "nodejs";

type PlaybackEndRouteProps = {
  params: {
    sessionId: string;
  };
};

export async function POST(_request: Request, { params }: PlaybackEndRouteProps) {
  const result = await endPlaybackSession(params.sessionId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
