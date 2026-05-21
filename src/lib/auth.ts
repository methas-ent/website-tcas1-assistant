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

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      userId,
      sessionTokenHash: hashToken(token),
      expiresAt,
    },
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { sessionTokenHash: hashToken(token) },
    });
  }

  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;

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

export function isStudent(user: CurrentUser | null) {
  return user?.role === "STUDENT";
}

export function isAdmin(user: CurrentUser | null) {
  return user?.role === "ADMIN";
}
