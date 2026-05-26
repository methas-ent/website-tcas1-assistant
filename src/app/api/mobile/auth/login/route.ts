import { NextResponse, type NextRequest } from "next/server";
import {
  createSessionRecord,
  normalizeEmail,
  normalizeText,
  verifyPassword,
} from "@/lib/auth";
import prisma from "@/lib/db";
import { mobileUser } from "@/lib/mobile-api";

export const runtime = "nodejs";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: NextRequest) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const email = normalizeEmail(typeof body.email === "string" ? body.email : null);
  const password = normalizeText(
    typeof body.password === "string" ? body.password : null,
  );

  const user = await prisma.user.findUnique({ where: { email } });

  if (
    !user ||
    user.role !== "STUDENT" ||
    !verifyPassword(password, user.passwordHash)
  ) {
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "Invalid student login" },
      { status: 401 },
    );
  }

  const session = await createSessionRecord(user.id);

  return NextResponse.json({
    sessionToken: session.token,
    expiresAt: session.expiresAt.toISOString(),
    maxAgeSeconds: session.maxAgeSeconds,
    user: mobileUser(user),
  });
}
