import Link from "next/link";
import { StudentShell } from "@/components/student";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { markLessonCompleteAction } from "@/lib/student-learning-actions";
import {
  getStudentLessonContext,
  requireStudent,
} from "@/lib/student-learning";

type StudentLessonPageProps = {
  params: {
    lessonId: string;
  };
};

export default async function StudentLessonPage({
  params,
}: StudentLessonPageProps) {
  const user = await requireStudent(`/student/lessons/${params.lessonId}`);
  const context = await getStudentLessonContext(user.id, params.lessonId);

  if (!context) {
    return (
      <StudentShell title="ไม่มีสิทธิ์เข้าเรียน">
        <EmptyState
          title="ไม่สามารถเปิดบทเรียนนี้ได้"
          description="บทเรียนนี้อาจไม่ได้อยู่ในคอร์สที่คุณได้รับสิทธิ์ หรือยังไม่เปิดให้เรียน"
          action={
            <ButtonLink href="/student/my-courses">กลับคอร์สของฉัน</ButtonLink>
          }
          tone="danger"
        />
      </StudentShell>
    );
  }

  const chapterProgress =
    context.chapter.id
      ? context.chapters.find((chapter) => chapter.id === context.chapter.id)
      : null;
  const chapterProgressPercent =
    chapterProgress && chapterProgress.lessonCount > 0
      ? Math.round(
          (chapterProgress.completedLessonCount / chapterProgress.lessonCount) * 100,
        )
      : 0;

  return (
    <StudentShell
      title="ห้องเรียนวิดีโอ"
      actions={
        <ButtonLink
          href={`/student/courses/${context.course.id}`}
          size="sm"
          variant="outline"
        >
          กลับเนื้อหาคอร์ส
        </ButtonLink>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <div className="mb-5">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-muted">
              <Link
                href={`/student/courses/${context.course.id}`}
                className="text-primary-700 hover:text-primary-600"
              >
                {context.course.title}
              </Link>
              <span>/</span>
              <span>{context.chapter.title}</span>
            </div>
            <h1 className="mt-3 font-heading text-2xl font-bold text-ink sm:text-3xl">
              {context.lesson.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="neutral">{context.lesson.durationLabel}</Badge>
              {context.lesson.completed ? (
                <Badge variant="success">เรียนจบแล้ว</Badge>
              ) : (
                <Badge variant="primary">กำลังเรียน</Badge>
              )}
            </div>
          </div>

          <VideoPlayer lessonId={context.lesson.id} title={context.lesson.title} />

          <Card className="mt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-lg font-bold text-ink">
                  ความคืบหน้าบทเรียน
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {context.lesson.completed
                    ? "บันทึกว่าเรียนจบแล้ว"
                    : "กดบันทึกเมื่อเรียนบทนี้จบ"}
                </p>
              </div>
              <form action={markLessonCompleteAction} className="w-full sm:w-auto">
                <input name="lessonId" type="hidden" value={context.lesson.id} />
                <input
                  name="progressSeconds"
                  type="hidden"
                  value={context.lesson.durationSeconds ?? 0}
                />
                <Button
                  className="w-full sm:w-auto"
                  type="submit"
                  variant={context.lesson.completed ? "outline" : "success"}
                >
                  {context.lesson.completed
                    ? "บันทึกซ้ำว่าเรียนจบ"
                    : "ทำเครื่องหมายว่าเรียนจบ"}
                </Button>
              </form>
            </div>
          </Card>

          <div className="mt-5 grid gap-3 sm:flex sm:items-center sm:justify-between">
            {context.previousLessonId ? (
              <ButtonLink
                className="w-full sm:w-auto"
                href={`/student/lessons/${context.previousLessonId}`}
                variant="outline"
              >
                EP ก่อนหน้า
              </ButtonLink>
            ) : (
              <span />
            )}
            {context.nextLessonId ? (
              <ButtonLink
                className="w-full sm:w-auto"
                href={`/student/lessons/${context.nextLessonId}`}
              >
                EP ถัดไป
              </ButtonLink>
            ) : null}
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
              Chapter Navigation
            </p>
            <h2 className="mt-2 font-heading text-lg font-bold text-ink">
              {context.chapter.title}
            </h2>
            <div className="mt-4">
              <ProgressBar value={chapterProgressPercent} label="ความคืบหน้าบทนี้" />
            </div>
            <div className="mt-5 grid gap-4">
              {context.chapters.map((chapter) => (
                <section key={chapter.id}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-ink">
                      {chapter.sortOrder}. {chapter.title}
                    </h3>
                    <span className="text-xs font-semibold text-ink-muted">
                      {chapter.completedLessonCount}/{chapter.lessonCount}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2">
                    {chapter.lessons.map((lesson) => {
                      const active = lesson.id === context.lesson.id;

                      return (
                        <Link
                          key={lesson.id}
                          href={`/student/lessons/${lesson.id}`}
                          className={cn(
                            "rounded-2xl px-4 py-3 text-sm transition",
                            active
                              ? "bg-primary text-white shadow-sm"
                              : "bg-surface-soft text-ink hover:bg-primary-50 hover:text-primary-700",
                          )}
                        >
                          <span className="block font-bold">
                            EP{lesson.epNumber} · {lesson.title}
                          </span>
                          <span
                            className={cn(
                              "mt-1 block text-xs",
                              active ? "text-primary-100" : "text-ink-muted",
                            )}
                          >
                            {lesson.durationLabel}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </StudentShell>
  );
}
