import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { getCurrentUser, isAdmin, isStudent, type CurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";

const PLAYBACK_AUDIENCE = "vdo-playback";
const DEFAULT_PLAYBACK_TTL_SECONDS = 2 * 60;
const DEV_PLAYBACK_SECRET = randomBytes(32).toString("hex");

export type PlaybackAccessError =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "NO_VIDEO";

export type PlaybackAccessResult =
  | {
      ok: true;
      user: CurrentUser;
      lesson: {
        id: string;
        title: string;
        courseId: string;
        isPublished: boolean;
        course: {
          id: string;
          title: string;
          isPublished: boolean;
        };
        chapter: {
          id: string;
          title: string;
          isPublished: boolean;
        };
        videoAsset: {
          id: string;
          title: string;
          storageProvider: string;
          storageKey: string;
          mimeType: string;
          sizeBytes: bigint;
          status: string;
        } | null;
      };
    }
  | {
      ok: false;
      status: 401 | 403 | 404;
      error: PlaybackAccessError;
    };

export type PlaybackTokenPayload = {
  aud: typeof PLAYBACK_AUDIENCE;
  sessionId: string;
  iat: number;
  exp: number;
  nonce: string;
};

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function getPlaybackTokenTtlSeconds() {
  const configured = Number.parseInt(
    process.env.PLAYBACK_TOKEN_TTL_SECONDS ?? "",
    10,
  );

  if (Number.isFinite(configured) && configured > 0) {
    return Math.min(configured, 5 * 60);
  }

  return DEFAULT_PLAYBACK_TTL_SECONDS;
}

function isPlaceholderSecret(value: string) {
  return value.includes("replace-me") || value.includes("replace-with");
}

function getPlaybackSecret() {
  const configured =
    process.env.PLAYBACK_SECRET?.trim() ||
    process.env.PLAYBACK_TOKEN_SECRET?.trim() ||
    "";

  if (configured && !isPlaceholderSecret(configured)) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("PLAYBACK_SECRET must be configured in production.");
  }

  return DEV_PLAYBACK_SECRET;
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getPlaybackSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createPlaybackToken(input: {
  sessionId: string;
}) {
  const iat = nowSeconds();
  const exp = iat + getPlaybackTokenTtlSeconds();
  const payload: PlaybackTokenPayload = {
    aud: PLAYBACK_AUDIENCE,
    sessionId: input.sessionId,
    iat,
    exp,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encodedPayload = base64UrlJson(payload);

  return {
    token: `${encodedPayload}.${sign(encodedPayload)}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function verifyPlaybackToken(token: string): PlaybackTokenPayload | null {
  const [encodedPayload, signature, ...rest] = token.split(".");

  if (!encodedPayload || !signature || rest.length > 0) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<PlaybackTokenPayload>;

    if (
      payload.aud !== PLAYBACK_AUDIENCE ||
      typeof payload.sessionId !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= nowSeconds()
    ) {
      return null;
    }

    return payload as PlaybackTokenPayload;
  } catch {
    return null;
  }
}

function hasReadyVideo(
  lesson: Extract<PlaybackAccessResult, { ok: true }>["lesson"],
) {
  return Boolean(lesson.videoAsset && lesson.videoAsset.status === "READY");
}

export async function authorizeLessonPlayback(
  lessonId: string,
  options: { requireVideo?: boolean } = {},
): Promise<PlaybackAccessResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, status: 401, error: "UNAUTHENTICATED" };
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      courseId: true,
      isPublished: true,
      course: {
        select: {
          id: true,
          title: true,
          isPublished: true,
        },
      },
      chapter: {
        select: {
          id: true,
          title: true,
          isPublished: true,
        },
      },
      videoAsset: {
        select: {
          id: true,
          title: true,
          storageProvider: true,
          storageKey: true,
          mimeType: true,
          sizeBytes: true,
          status: true,
        },
      },
    },
  });

  if (!lesson) {
    return { ok: false, status: 404, error: "NOT_FOUND" };
  }

  if (isAdmin(user)) {
    if (options.requireVideo && !hasReadyVideo(lesson)) {
      return { ok: false, status: 404, error: "NO_VIDEO" };
    }

    return { ok: true, user, lesson };
  }

  if (!isStudent(user)) {
    return { ok: false, status: 403, error: "FORBIDDEN" };
  }

  if (
    !lesson.isPublished ||
    !lesson.course.isPublished ||
    !lesson.chapter.isPublished
  ) {
    return { ok: false, status: 404, error: "NOT_FOUND" };
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: user.id,
      courseId: lesson.courseId,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });

  if (!enrollment) {
    return { ok: false, status: 403, error: "FORBIDDEN" };
  }

  if (options.requireVideo && !hasReadyVideo(lesson)) {
    return { ok: false, status: 404, error: "NO_VIDEO" };
  }

  return { ok: true, user, lesson };
}

export function getPlaybackErrorMessage(error: PlaybackAccessError) {
  const messages: Record<PlaybackAccessError, string> = {
    UNAUTHENTICATED: "กรุณาเข้าสู่ระบบก่อนรับสิทธิ์เล่นวิดีโอ",
    FORBIDDEN: "บัญชีนี้ยังไม่มีสิทธิ์เข้าชม lesson นี้",
    NOT_FOUND: "ไม่พบ lesson ที่ต้องการเล่น",
    NO_VIDEO: "lesson นี้ยังไม่มีวิดีโอที่พร้อมเล่น",
  };

  return messages[error];
}
