import { NextResponse } from "next/server";
import { touchPlaybackSession } from "@/lib/playback-session";

export const runtime = "nodejs";

type PlaybackHeartbeatRouteProps = {
  params: {
    sessionId: string;
  };
};

export async function POST(
  _request: Request,
  { params }: PlaybackHeartbeatRouteProps,
) {
  const result = await touchPlaybackSession(params.sessionId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
