import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/public/AddToCartButton";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatDuration, getCourseBySlug } from "@/lib/catalog/queries";
import {
  formatCompactDuration,
  formatPrice,
  getPackageBySlug,
  getStorefrontCatalog,
} from "@/lib/storefront";

type DetailPageProps = {
  params: {
    courseSlug: string;
  };
};

export default async function CourseOrPackagePage({ params }: DetailPageProps) {
  const coursePackage = await getPackageBySlug(params.courseSlug);

  if (coursePackage) {
    return (
      <div className="min-h-screen bg-surface-soft">
        <PublicHeader />
        <main>
          <PageHeader
            eyebrow="Course Package"
            title={coursePackage.title}
            description={coursePackage.description}
            actions={<AddToCartButton packageId={coursePackage.id} size="lg" />}
          />
          <section className="mx-auto grid max-w-7xl gap-6 px-page py-8 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-8">
              <Card>
                <SectionHeader
                  eyebrow="Included Courses"
                  title="คอร์สที่รวมอยู่ในแพ็กเกจ"
                  description="เมื่อผู้ดูแลยืนยันการชำระเงินแล้ว นักเรียนจะได้รับสิทธิ์เข้าเรียนคอร์สเหล่านี้"
                />
                <div className="mt-6 grid gap-4">
                  {coursePackage.courses.map((course) => (
                    <Link
                      className="grid gap-3 rounded-card border border-line bg-surface-soft p-4 transition hover:border-primary-200 hover:bg-primary-50"
                      href={`/courses/${course.slug}`}
                      key={course.id}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary">{course.level}</Badge>
                        <Badge variant="neutral">{course.category}</Badge>
                      </div>
                      <div>
                        <h2 className="font-heading text-xl font-bold text-ink">
                          {course.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-ink-muted">
                          {course.description}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-ink-muted">
                        {course.chapterCount} บท · {course.lessonCount} บทเรียน ·{" "}
                        {formatCompactDuration(course.durationSeconds)}
                      </p>
                    </Link>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionHeader
                  eyebrow="What You Get"
                  title="สิ่งที่ผู้เรียนจะได้รับ"
                />
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    "รายการคอร์สแบบเป็นระบบ",
                    "บทเรียนวิดีโอและ lesson list",
                    "คำสั่งซื้อรอตรวจสอบโดยผู้ดูแล",
                  ].map((item) => (
                    <div
                      className="rounded-card bg-primary-50 p-4 text-sm font-bold text-primary-800"
                      key={item}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Card>
                <p className="text-sm font-bold text-ink-muted">ราคาแพ็กเกจ</p>
                <p className="mt-2 font-heading text-3xl font-bold text-primary-700">
                  {formatPrice(coursePackage.priceCents, coursePackage.currency)}
                </p>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">จำนวนคอร์ส</dt>
                    <dd className="font-bold text-ink">
                      {coursePackage.courseCount}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">บทเรียน</dt>
                    <dd className="font-bold text-ink">
                      {coursePackage.lessonCount}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">เวลาเรียน</dt>
                    <dd className="font-bold text-ink">
                      {formatCompactDuration(coursePackage.durationSeconds)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-6 grid gap-3">
                  <AddToCartButton packageId={coursePackage.id} size="lg" />
                  <ButtonLink href="/cart" variant="outline">
                    เปิดตะกร้า
                  </ButtonLink>
                </div>
                <p className="mt-4 text-xs leading-5 text-ink-muted">
                  Checkout จะสร้างคำสั่งซื้อสถานะรอตรวจสอบ ยังไม่มีการตัดเงินอัตโนมัติ
                </p>
              </Card>
            </aside>
          </section>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const course = await getCourseBySlug(params.courseSlug);

  if (!course) {
    notFound();
  }

  const { packages } = await getStorefrontCatalog();
  const relatedPackages = packages.filter((item) =>
    item.courses.some((includedCourse) => includedCourse.id === course.id),
  );

  return (
    <div className="min-h-screen bg-surface-soft">
      <PublicHeader />
      <main>
        <PageHeader
          eyebrow={course.courseCode}
          title={course.title}
          description={course.description}
          actions={
            relatedPackages[0] ? (
              <AddToCartButton packageId={relatedPackages[0].id} size="lg" />
            ) : (
              <ButtonLink href="/courses" size="lg">
                ดูแพ็กเกจทั้งหมด
              </ButtonLink>
            )
          }
        />
        <section className="mx-auto grid max-w-7xl gap-6 px-page py-8 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-6">
            <Card>
              <SectionHeader
                eyebrow={course.subject}
                title="เนื้อหาคอร์ส"
                description="ดูภาพรวมบทเรียนก่อนเลือกแพ็กเกจที่มีคอร์สนี้"
              />
              <div className="mt-6 grid gap-3">
                {course.modules.map((courseModule) => (
                  <div
                    className="rounded-card border border-line bg-surface-soft p-4"
                    key={courseModule.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-heading text-lg font-bold text-ink">
                        {courseModule.sortOrder}. {courseModule.title}
                      </h2>
                      <span className="text-xs font-bold text-primary-700">
                        {courseModule.lessonCount} บทเรียน
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink-muted">
                      รวมเวลา {formatDuration(courseModule.totalDurationSeconds)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card>
              <p className="text-sm font-bold text-ink-muted">
                แพ็กเกจที่มีคอร์สนี้
              </p>
              <div className="mt-4 grid gap-4">
                {relatedPackages.map((item) => (
                  <div
                    className="rounded-card border border-line bg-surface-soft p-4"
                    key={item.id}
                  >
                    <h2 className="font-heading text-lg font-bold text-ink">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm text-ink-muted">
                      {formatPrice(item.priceCents, item.currency)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <AddToCartButton packageId={item.id} size="sm" />
                      <ButtonLink
                        href={`/courses/${item.slug}`}
                        size="sm"
                        variant="outline"
                      >
                        รายละเอียดแพ็กเกจ
                      </ButtonLink>
                    </div>
                  </div>
                ))}
                {!relatedPackages.length ? (
                  <p className="text-sm text-ink-muted">
                    ยังไม่มีแพ็กเกจที่รวมคอร์สนี้
                  </p>
                ) : null}
              </div>
            </Card>
          </aside>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
