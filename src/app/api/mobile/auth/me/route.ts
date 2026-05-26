import { NextResponse, type NextRequest } from "next/server";
import { requireMobileStudent, mobileUser } from "@/lib/mobile-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireMobileStudent(request);

  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json({ user: mobileUser(auth.user) });
}
