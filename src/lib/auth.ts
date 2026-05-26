import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import prisma from "@/lib/db";

const SESSION_COOKIE = "vdo_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function hashToken(token: string) {
  return scryptSync(token, "vdo-session", 64).toString("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [scheme, salt, storedHash] = passwordHash.split("$");

  if (scheme !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHash, "hex");

  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

export function normalizeEmail(email: FormDataEntryValue | null) {
  return String(email ?? "").trim().toLowerCase();
}

export function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createSessionRecord(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      userId,
      sessionTokenHash: hashToken(token),
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
    maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSession(userId: string) {
  const session = await createSessionRecord(userId);

  cookies().set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.maxAgeSeconds,
  });

  return session;
}

export async function clearSessionToken(token: string | null | undefined) {
  if (token) {
    await prisma.session.deleteMany({
      where: { sessionTokenHash: hashToken(token) },
    });
  }
}

export async function clearSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;

  await clearSessionToken(token);
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUserFromToken(
  token: string | null | undefined,
): Promise<CurrentUser | null> {
  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionTokenHash: hashToken(token) },
    select: {
      expiresAt: true,
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

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));

  return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null;
}

export function getSessionTokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() === "bearer" && token) {
    return token;
  }

  return parseCookieHeader(request.headers.get("cookie"));
}

export async function getCurrentUserFromRequest(request: Request) {
  return getCurrentUserFromToken(getSessionTokenFromRequest(request));
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return getCurrentUserFromToken(cookies().get(SESSION_COOKIE)?.value);
}

export function isStudent(user: CurrentUser | null) {
  return user?.role === "STUDENT";
}

export function isAdmin(user: CurrentUser | null) {
  return user?.role === "ADMIN";
}
