import {
  authorizeLessonPlayback,
  createPlaybackToken,
  getPlaybackErrorMessage,
} from "@/lib/secure-playback";
import prisma from "@/lib/db";

type SessionAccessFailure = {
  ok: false;
  status: 401 | 403 | 404;
  error: string;
  message: string;
};

type SessionAccessSuccess = {
  ok: true;
  session: {
    id: string;
    userId: string | null;
    lessonId: string;
    status: string;
    endedAt: Date | null;
  };
  access: Extract<Awaited<ReturnType<typeof authorizeLessonPlayback>>, { ok: true }>;
};

export type PlaybackSessionAccess = SessionAccessFailure | SessionAccessSuccess;

export async function authorizePlaybackSession(
  sessionId: string,
): Promise<PlaybackSessionAccess> {
  const session = await prisma.playbackSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      lessonId: true,
      status: true,
      endedAt: true,
    },
  });

  if (!session || session.status !== "ACTIVE" || session.endedAt) {
    return {
      ok: false,
      status: 401,
      error: "SESSION_INACTIVE",
      message: "Playback session is not active",
    };
  }

  const access = await authorizeLessonPlayback(session.lessonId, {
    requireVideo: true,
  });

  if (!access.ok) {
    return {
      ok: false,
      status: access.status,
      error: access.error,
      message: getPlaybackErrorMessage(access.error),
    };
  }

  if (!session.userId || access.user.id !== session.userId) {
    return {
      ok: false,
      status: 403,
      error: "FORBIDDEN",
      message: "Token user mismatch",
    };
  }

  return {
    ok: true,
    session,
    access,
  };
}

export async function issuePlaybackTokenForSession(sessionId: string) {
  const result = await authorizePlaybackSession(sessionId);

  if (!result.ok) {
    return result;
  }

  const videoAsset = result.access.lesson.videoAsset;

  if (!videoAsset) {
    return {
      ok: false,
      status: 404,
      error: "NO_VIDEO",
      message: getPlaybackErrorMessage("NO_VIDEO"),
    } as const;
  }

  const { token, expiresAt } = createPlaybackToken({ sessionId });

  return {
    ok: true,
    playbackUrl: `/api/playback/stream/${encodeURIComponent(token)}`,
    expiresAt,
    sessionId,
    lessonTitle: result.access.lesson.title,
    mimeType: videoAsset.mimeType,
  } as const;
}

export async function touchPlaybackSession(sessionId: string) {
  const result = await authorizePlaybackSession(sessionId);

  if (!result.ok) {
    return result;
  }

  await prisma.playbackSession.update({
    where: { id: result.session.id },
    data: { lastHeartbeatAt: new Date() },
  });

  return { ok: true } as const;
}

export async function endPlaybackSession(sessionId: string) {
  const result = await authorizePlaybackSession(sessionId);

  if (!result.ok) {
    return result;
  }

  await prisma.playbackSession.update({
    where: { id: result.session.id },
    data: {
      status: "ENDED",
      endedAt: new Date(),
      lastHeartbeatAt: new Date(),
    },
  });

  return { ok: true } as const;
}
