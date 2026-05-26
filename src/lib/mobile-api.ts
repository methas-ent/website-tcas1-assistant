import { NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  isStudent,
  type CurrentUser,
} from "@/lib/auth";

type MobileAuthResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; response: NextResponse };

export async function requireMobileStudent(
  request: Request,
): Promise<MobileAuthResult> {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHENTICATED", message: "Login required" },
        { status: 401 },
      ),
    };
  }

  if (!isStudent(user)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "FORBIDDEN", message: "Student account required" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}

export function mobileUser(user: CurrentUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
