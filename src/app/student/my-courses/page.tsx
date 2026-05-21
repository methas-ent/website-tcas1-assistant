import { CourseCard, StudentShell } from "@/components/student";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  formatDuration,
  formatShortDate,
  getStudentCourses,
  requireStudent,
} from "@/lib/student-learning";

export default async function StudentMyCoursesPage() {
  const user = await requireStudent("/student/my-courses");
  const courses = await getStudentCourses(user.id);
  const completedCourseCount = courses.filter(
    (course) => course.progressPercent >= 100,
  ).length;

  return (
    <StudentShell title="คอร์สของฉัน">
      <div className="grid gap-6">
        <SectionHeader
          eyebrow="My Courses"
          title={`สวัสดี ${user.name}`}
          description="รวมคอร์สที่ได้รับสิทธิ์เข้าเรียนจากคำสั่งซื้อที่ผู้ดูแลอนุมัติแล้ว"
          actions={
            <ButtonLink href="/courses" variant="outline">
              ดูคอร์สทั้งหมด
            </ButtonLink>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <p className="text-sm font-bold text-ink-muted">คอร์สที่เข้าเรียนได้</p>
            <p className="mt-2 font-heading text-3xl font-black text-primary-700">
              {courses.length}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <p className="text-sm font-bold text-ink-muted">เรียนครบแล้ว</p>
            <p className="mt-2 font-heading text-3xl font-black text-success">
              {completedCourseCount}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <p className="text-sm font-bold text-ink-muted">บทเรียนทั้งหมด</p>
            <p className="mt-2 font-heading text-3xl font-black text-ink">
              {courses.reduce((sum, course) => sum + course.lessonCount, 0)}
            </p>
          </div>
        </div>

        {courses.length > 0 ? (
          <div className="grid gap-5">
            {courses.map((course) => {
              const expiryDate = formatShortDate(course.expiresAt);

              return (
                <CourseCard
                  key={course.id}
                  title={course.title}
                  courseCode={course.courseCode}
                  subject={course.subject}
                  description={course.description}
                  level={course.level}
                  coverImageUrl={course.coverImageUrl}
                  progressPercent={course.progressPercent}
                  moduleCount={course.chapterCount}
                  lessonCount={course.lessonCount}
                  durationLabel={formatDuration(course.totalDurationSeconds)}
                  expiresLabel={
                    expiryDate ? `หมดอายุ ${expiryDate}` : "ไม่มีวันหมดอายุ"
                  }
                  href={`/student/courses/${course.id}`}
                  actionLabel={
                    course.progressPercent > 0 ? "เรียนต่อ" : "เลือกบทเรียน"
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="ยังไม่มีคอร์สที่เข้าเรียนได้"
            description="เมื่อผู้ดูแลอนุมัติคำสั่งซื้อแล้ว คอร์สจะปรากฏที่นี่โดยอัตโนมัติ"
            action={<ButtonLink href="/courses">เลือกแพ็กเกจคอร์ส</ButtonLink>}
            tone="primary"
          />
        )}
      </div>
    </StudentShell>
  );
}
