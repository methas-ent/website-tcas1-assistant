import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { touchPlaybackSession } from "@/lib/playback-session";

export const runtime = "nodejs";

type PlaybackHeartbeatRouteProps = {
  params: {
    sessionId: string;
  };
};

export async function POST(
  request: NextRequest,
  { params }: PlaybackHeartbeatRouteProps,
) {
  const user = await getCurrentUserFromRequest(request);
  const result = await touchPlaybackSession(params.sessionId, user);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
