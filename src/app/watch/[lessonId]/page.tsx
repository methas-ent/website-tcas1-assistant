import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { AppTopNav } from "@/components/ui/AppTopNav";
import { formatDuration, getWatchLessonContext } from "@/lib/catalog/queries";
import { isAdmin, isStudent } from "@/lib/auth";
import { authorizeLessonPlayback } from "@/lib/secure-playback";

type WatchPageProps = {
  params: {
    lessonId: string;
  };
};

export default async function WatchPage({ params }: WatchPageProps) {
  const access = await authorizeLessonPlayback(params.lessonId);

  if (!access.ok) {
    if (access.error === "UNAUTHENTICATED") {
      redirect(
        `/admin/login?next=${encodeURIComponent(`/watch/${params.lessonId}`)}`,
      );
    }

    notFound();
  }

  if (isStudent(access.user)) {
    redirect(`/student/lessons/${params.lessonId}`);
  }

  if (!isAdmin(access.user)) {
    notFound();
  }

  const context = await getWatchLessonContext(params.lessonId, undefined, true);

  if (!context) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-surface-soft">
      <AppTopNav />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <section>
          <div className="mb-5">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-muted">
              <Link
                href={`/courses/${context.course.slug}`}
                className="text-primary-700 hover:text-primary-600"
              >
                {context.course.title}
              </Link>
              <span>/</span>
              <Link
                href={`/courses/${context.course.slug}/modules/${context.module.slug}`}
                className="text-primary-700 hover:text-primary-600"
              >
                {context.module.title}
              </Link>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">
              {context.lesson.title}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Admin preview · {formatDuration(context.lesson.durationSeconds)}
            </p>
          </div>

          <VideoPlayer lessonId={context.lesson.id} title={context.lesson.title} />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {context.previousLessonId ? (
              <Link
                href={`/watch/${context.previousLessonId}`}
                className="inline-flex h-11 items-center rounded-full border border-primary-200 bg-white px-5 text-sm font-bold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                EP ก่อนหน้า
              </Link>
            ) : (
              <span />
            )}
            {context.nextLessonId ? (
              <Link
                href={`/watch/${context.nextLessonId}`}
                className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                EP ถัดไป
              </Link>
            ) : null}
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-primary-100 bg-white p-4 shadow-card">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">
              Admin Preview
            </p>
            <h2 className="mt-2 text-lg font-bold text-ink">
              {context.module.title}
            </h2>
            <div className="mt-4 grid gap-2">
              {context.lessons.map((lesson) => {
                const active = lesson.id === context.lesson.id;

                return (
                  <Link
                    key={lesson.id}
                    href={`/watch/${lesson.id}`}
                    className={
                      active
                        ? "rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white"
                        : "rounded-2xl bg-surface-soft px-4 py-3 text-sm font-semibold text-ink transition hover:bg-primary-50 hover:text-primary-700"
                    }
                  >
                    <span className="block">
                      EP{lesson.epNumber} · {lesson.title}
                    </span>
                    <span
                      className={
                        active
                          ? "mt-1 block text-xs text-primary-100"
                          : "mt-1 block text-xs text-ink-muted"
                      }
                    >
                      {formatDuration(lesson.durationSeconds)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
