import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { endPlaybackSession } from "@/lib/playback-session";

export const runtime = "nodejs";

type PlaybackEndRouteProps = {
  params: {
    sessionId: string;
  };
};

export async function POST(
  request: NextRequest,
  { params }: PlaybackEndRouteProps,
) {
  const user = await getCurrentUserFromRequest(request);
  const result = await endPlaybackSession(params.sessionId, user);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
