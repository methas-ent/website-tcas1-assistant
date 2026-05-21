import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodeRow } from "@/components/course/EpisodeRow";
import { AppTopNav } from "@/components/ui/AppTopNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { getModuleBySlug } from "@/lib/catalog/queries";

type ModulePageProps = {
  params: {
    courseSlug: string;
    moduleSlug: string;
  };
};

export default async function ModulePage({ params }: ModulePageProps) {
  const courseModule = await getModuleBySlug(
    params.courseSlug,
    params.moduleSlug,
  );

  if (!courseModule) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-surface-soft">
      <AppTopNav />
      <main>
        <PageHeader
          eyebrow={`${courseModule.course.courseCode} / ${courseModule.course.subject}`}
          title={courseModule.title}
          description={`คอร์ส ${courseModule.course.title} · ${courseModule.lessons.length} EP`}
          actions={
            <Link
              href={`/courses/${courseModule.course.slug}`}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-primary-700 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-auto"
            >
              กลับหน้าเนื้อหา
            </Link>
          }
        />
        <section className="mx-auto max-w-5xl px-page py-6 sm:py-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-primary-700">
                Episode list
              </p>
              <h2 className="mt-1 text-2xl font-bold text-ink">
                ดูรายการบทเรียนก่อนซื้อคอร์ส
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                ผู้สนใจดูชื่อบทเรียนได้ แต่ระบบจะล็อกวิดีโอไว้จนกว่าจะมีสิทธิ์เรียน
              </p>
            </div>
            <Link
              href="/student/my-courses"
              className="rounded-full text-sm font-bold text-primary-700 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            >
              คอร์สของฉัน →
            </Link>
          </div>
          <div className="grid gap-3">
            {courseModule.lessons.length > 0 ? (
              courseModule.lessons.map((lesson) => (
                <EpisodeRow key={lesson.id} lesson={lesson} />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-primary-200 bg-white p-8 text-center text-ink-muted">
                โมดูลนี้ยังไม่มี EP ที่ publish แล้ว
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
