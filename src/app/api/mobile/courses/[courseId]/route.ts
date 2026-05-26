import { NextResponse, type NextRequest } from "next/server";
import { getStudentCourseAccess } from "@/lib/student-learning";
import { requireMobileStudent } from "@/lib/mobile-api";

export const runtime = "nodejs";

type MobileCourseRouteProps = {
  params: {
    courseId: string;
  };
};

export async function GET(
  request: NextRequest,
  { params }: MobileCourseRouteProps,
) {
  const auth = await requireMobileStudent(request);

  if (!auth.ok) {
    return auth.response;
  }

  const access = await getStudentCourseAccess(auth.user.id, params.courseId);

  if (access.status === "missing") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (access.status === "denied") {
    return NextResponse.json(
      { error: "FORBIDDEN", course: access.course },
      { status: 403 },
    );
  }

  return NextResponse.json({
    course: {
      ...access.course,
      expiresAt: access.course.expiresAt?.toISOString() ?? null,
    },
  });
}
