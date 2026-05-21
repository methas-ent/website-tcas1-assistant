import { notFound } from "next/navigation";
import { CourseCover } from "@/components/course/CourseCover";
import { LessonLaunchButton, StudentShell } from "@/components/student";
import { Accordion } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  formatDuration,
  formatShortDate,
  getStudentCourseAccess,
  requireStudent,
} from "@/lib/student-learning";

type StudentCoursePageProps = {
  params: {
    courseId: string;
  };
};

export default async function StudentCoursePage({
  params,
}: StudentCoursePageProps) {
  const user = await requireStudent(`/student/courses/${params.courseId}`);
  const access = await getStudentCourseAccess(user.id, params.courseId);

  if (access.status === "missing") {
    notFound();
  }

  if (access.status === "denied") {
    return (
      <StudentShell title="ไม่มีสิทธิ์เข้าเรียน">
        <EmptyState
          title="คอร์สนี้ยังไม่ได้อยู่ในบัญชีของคุณ"
          description="เลือกแพ็กเกจที่มีคอร์สนี้ หรือรอผู้ดูแลอนุมัติคำสั่งซื้อที่ชำระแล้ว"
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href={`/courses/${access.course.slug}`}>
                ดูรายละเอียดคอร์ส
              </ButtonLink>
              <ButtonLink href="/student/my-courses" variant="outline">
                กลับคอร์สของฉัน
              </ButtonLink>
            </div>
          }
          tone="danger"
        />
      </StudentShell>
    );
  }

  const course = access.course;
  const expiryDate = formatShortDate(course.expiresAt);

  return (
    <StudentShell
      title="เนื้อหาคอร์ส"
      actions={
        <ButtonLink href="/student/my-courses" size="sm" variant="outline">
          คอร์สของฉัน
        </ButtonLink>
      }
    >
      <div className="grid gap-6">
        <SectionHeader
          eyebrow={course.courseCode || "Course Content"}
          title={course.title}
          description={course.description}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
          <div className="grid gap-5 lg:self-start">
            <CourseCover
              title={course.title}
              subject={course.subject}
              src={course.coverImageUrl}
              priority
            />
            <Card>
              <div className="flex flex-wrap gap-2">
                <Badge variant="primary">{course.subject}</Badge>
                <Badge variant="accent">{course.level}</Badge>
                {expiryDate ? (
                  <Badge variant="warning">หมดอายุ {expiryDate}</Badge>
                ) : (
                  <Badge variant="success">ไม่มีวันหมดอายุ</Badge>
                )}
              </div>
              <div className="mt-5">
                <ProgressBar value={course.progressPercent} />
              </div>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-2xl bg-surface-muted p-3">
                  <dt className="font-bold text-ink">บท</dt>
                  <dd className="mt-1 text-ink-muted">{course.chapterCount}</dd>
                </div>
                <div className="rounded-2xl bg-surface-muted p-3">
                  <dt className="font-bold text-ink">บทเรียน</dt>
                  <dd className="mt-1 text-ink-muted">{course.lessonCount}</dd>
                </div>
                <div className="rounded-2xl bg-surface-muted p-3">
                  <dt className="font-bold text-ink">เวลาเรียน</dt>
                  <dd className="mt-1 text-ink-muted">
                    {formatDuration(course.totalDurationSeconds)}
                  </dd>
                </div>
              </dl>
              {course.continueLessonId ? (
                <div className="mt-5">
                  <ButtonLink href={`/student/lessons/${course.continueLessonId}`}>
                    เรียนบทถัดไป
                  </ButtonLink>
                </div>
              ) : null}
            </Card>
          </div>

          <section className="min-w-0">
            <SectionHeader
              eyebrow="Chapter List"
              title="บทเรียนทั้งหมด"
              description={`${course.completedLessonCount}/${course.lessonCount} บทเรียนเรียนจบแล้ว`}
              className="mb-4"
            />
            {course.chapters.length > 0 ? (
              <Accordion
                allowMultiple
                defaultValue={course.chapters[0]?.id}
                items={course.chapters.map((chapter) => ({
                  value: chapter.id,
                  title: (
                    <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
                      <span className="min-w-0">
                        {chapter.sortOrder}. {chapter.title}
                      </span>
                      <span className="text-xs font-semibold text-ink-muted">
                        {chapter.completedLessonCount}/{chapter.lessonCount}
                      </span>
                    </span>
                  ),
                  content:
                    chapter.lessons.length > 0 ? (
                      <div className="grid gap-3 pt-1">
                        {chapter.lessons.map((lesson) => (
                          <LessonLaunchButton
                            key={lesson.id}
                            lessonId={lesson.id}
                            title={lesson.title}
                            description={lesson.description}
                            durationLabel={lesson.durationLabel}
                            episodeLabel={`EP${lesson.epNumber}`}
                            completed={lesson.completed}
                            locked={lesson.locked}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-ink-muted">
                        ยังไม่มีบทเรียนที่เปิดเผยในบทนี้
                      </p>
                    ),
                }))}
              />
            ) : (
              <EmptyState
                title="ยังไม่มีบทเรียน"
                description="คอร์สนี้ยังไม่มี chapter ที่เปิดเผย"
              />
            )}
          </section>
        </div>
      </div>
    </StudentShell>
  );
}
