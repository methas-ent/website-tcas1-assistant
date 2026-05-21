import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeLessonPlayback,
  createPlaybackToken,
  getPlaybackErrorMessage,
} from "@/lib/secure-playback";
import prisma from "@/lib/db";

export const runtime = "nodejs";

type PlaybackAuthorizeBody = {
  lessonId?: unknown;
};

export async function POST(request: NextRequest) {
  let body: PlaybackAuthorizeBody;

  try {
    body = (await request.json()) as PlaybackAuthorizeBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const lessonId =
    typeof body.lessonId === "string" ? body.lessonId.trim() : "";

  if (!lessonId) {
    return NextResponse.json({ error: "Missing lessonId" }, { status: 400 });
  }

  const access = await authorizeLessonPlayback(lessonId, { requireVideo: true });

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, message: getPlaybackErrorMessage(access.error) },
      { status: access.status },
    );
  }

  const videoAsset = access.lesson.videoAsset;

  if (!videoAsset) {
    return NextResponse.json(
      { error: "NO_VIDEO", message: getPlaybackErrorMessage("NO_VIDEO") },
      { status: 404 },
    );
  }

  const playbackSession = await prisma.playbackSession.create({
    data: {
      userId: access.user.id,
      userKey: `${access.user.role.toLowerCase()}:${access.user.id}`,
      lessonId: access.lesson.id,
      status: "ACTIVE",
      lastHeartbeatAt: new Date(),
    },
    select: {
      id: true,
    },
  });

  const { token, expiresAt } = createPlaybackToken({
    sessionId: playbackSession.id,
  });

  return NextResponse.json({
    playbackUrl: `/api/playback/stream/${encodeURIComponent(token)}`,
    expiresAt,
    sessionId: playbackSession.id,
    lessonTitle: access.lesson.title,
    mimeType: videoAsset.mimeType,
  });
}
