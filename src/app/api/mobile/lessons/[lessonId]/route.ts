import { NextResponse, type NextRequest } from "next/server";
import { getStudentLessonContext } from "@/lib/student-learning";
import { requireMobileStudent } from "@/lib/mobile-api";

export const runtime = "nodejs";

type MobileLessonRouteProps = {
  params: {
    lessonId: string;
  };
};

export async function GET(
  request: NextRequest,
  { params }: MobileLessonRouteProps,
) {
  const auth = await requireMobileStudent(request);

  if (!auth.ok) {
    return auth.response;
  }

  const lesson = await getStudentLessonContext(auth.user.id, params.lessonId);

  if (!lesson) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  return NextResponse.json(lesson);
}
