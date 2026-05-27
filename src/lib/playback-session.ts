import {
  authorizeLessonPlayback,
  createPlaybackToken,
  getPlaybackErrorMessage,
} from "@/lib/secure-playback";
import type { CurrentUser } from "@/lib/auth";
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
  user?: CurrentUser | null,
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
    ...(user !== undefined ? { user } : {}),
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

export async function authorizePlaybackSessionToken(input: {
  sessionId: string;
  userId: string;
  lessonId: string;
}): Promise<PlaybackSessionAccess> {
  const session = await prisma.playbackSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      userId: true,
      lessonId: true,
      status: true,
      endedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
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

  if (
    !session.userId ||
    session.userId !== input.userId ||
    session.lessonId !== input.lessonId ||
    !session.user
  ) {
    return {
      ok: false,
      status: 403,
      error: "FORBIDDEN",
      message: "Token session mismatch",
    };
  }

  const access = await authorizeLessonPlayback(session.lessonId, {
    requireVideo: true,
    user: session.user,
  });

  if (!access.ok) {
    return {
      ok: false,
      status: access.status,
      error: access.error,
      message: getPlaybackErrorMessage(access.error),
    };
  }

  return {
    ok: true,
    session,
    access,
  };
}

export async function issuePlaybackTokenForSession(
  sessionId: string,
  user?: CurrentUser | null,
) {
  const result = await authorizePlaybackSession(sessionId, user);

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

  const { token, expiresAt } = createPlaybackToken({
    sessionId,
    userId: result.session.userId!,
    lessonId: result.session.lessonId,
  });

  return {
    ok: true,
    playbackUrl: `/api/playback/stream/${encodeURIComponent(token)}`,
    expiresAt,
    sessionId,
    lessonTitle: result.access.lesson.title,
    mimeType: videoAsset.mimeType,
  } as const;
}

export async function touchPlaybackSession(
  sessionId: string,
  user?: CurrentUser | null,
) {
  const result = await authorizePlaybackSession(sessionId, user);

  if (!result.ok) {
    return result;
  }

  await prisma.playbackSession.update({
    where: { id: result.session.id },
    data: { lastHeartbeatAt: new Date() },
  });

  return { ok: true } as const;
}

export async function endPlaybackSession(
  sessionId: string,
  user?: CurrentUser | null,
) {
  const result = await authorizePlaybackSession(sessionId, user);

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
