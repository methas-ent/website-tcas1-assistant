import { NextResponse, type NextRequest } from "next/server";
import { getStudentCourses } from "@/lib/student-learning";
import { requireMobileStudent } from "@/lib/mobile-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireMobileStudent(request);

  if (!auth.ok) {
    return auth.response;
  }

  const courses = await getStudentCourses(auth.user.id);

  return NextResponse.json({
    courses: courses.map((course) => ({
      ...course,
      expiresAt: course.expiresAt?.toISOString() ?? null,
    })),
  });
}
