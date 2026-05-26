import { NextResponse, type NextRequest } from "next/server";
import { clearSessionToken, getSessionTokenFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await clearSessionToken(getSessionTokenFromRequest(request));

  return NextResponse.json({ ok: true });
}
