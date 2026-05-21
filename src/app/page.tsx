import Link from "next/link";
import { AddToCartButton } from "@/components/public/AddToCartButton";
import { ProductCard } from "@/components/public/ProductCard";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  formatCompactDuration,
  formatPrice,
  getStorefrontCatalog,
} from "@/lib/storefront";

export default async function HomePage() {
  const { courses, packages } = await getStorefrontCatalog();
  const featuredPackages = packages.slice(0, 3);
  const featuredCourses = courses.slice(0, 3);

  return (
    <div className="min-h-screen bg-surface-soft">
      <PublicHeader />
      <main>
        <section className="bg-surface">
          <div className="mx-auto grid max-w-7xl gap-8 px-page py-10 sm:py-12 lg:grid-cols-[1fr_440px] lg:items-center lg:py-16">
            <div>
              <p className="text-sm font-bold text-primary-700">
                VDO Learning Platform
              </p>
              <h1 className="mt-4 max-w-3xl font-heading text-3xl font-bold text-ink sm:text-5xl">
                เลือกแพ็กเกจคอร์สออนไลน์ แล้วเริ่มเรียนหลังแอดมินยืนยันคำสั่งซื้อ
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-soft">
                รวมคอร์สเตรียมสอบและคอร์สทักษะสำหรับนักเรียนไทย พร้อมตะกร้าและ checkout แบบรอตรวจสอบการชำระเงิน
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <ButtonLink className="w-full sm:w-auto" href="/courses" size="lg">
                  ดูคอร์สทั้งหมด
                </ButtonLink>
                <ButtonLink
                  className="w-full sm:w-auto"
                  href="/cart"
                  size="lg"
                  variant="outline"
                >
                  ไปที่ตะกร้า
                </ButtonLink>
              </div>
            </div>

            <aside className="relative z-10 rounded-2xl border border-primary-200 bg-primary-50 p-5 text-ink shadow-raised sm:p-7">
              <p className="text-sm font-bold text-primary-700">
                แพ็กเกจเด่น
              </p>
              <h2 className="mt-2 font-heading text-3xl font-bold text-ink">
                {featuredPackages[0]?.title ?? "กำลังเตรียมแพ็กเกจ"}
              </h2>
              <p className="mt-4 text-sm font-medium leading-6 text-ink-soft">
                {featuredPackages[0]?.description ??
                  "แพ็กเกจคอร์สจะปรากฏที่นี่เมื่อ publish แล้ว"}
              </p>
              {featuredPackages[0] ? (
                <div className="mt-6 grid gap-3">
                  <div className="rounded-card border border-primary-100 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-ink-muted">ราคาแพ็กเกจ</p>
                    <p className="mt-1 font-heading text-3xl font-bold text-primary-700">
                      {formatPrice(
                        featuredPackages[0].priceCents,
                        featuredPackages[0].currency,
                      )}
                    </p>
                  </div>
                  <AddToCartButton
                    className="w-full"
                    packageId={featuredPackages[0].id}
                    size="lg"
                  />
                </div>
              ) : null}
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-page py-10" id="packages">
          <SectionHeader
            eyebrow="Packages"
            title="แพ็กเกจคอร์สแนะนำ"
            description="เลือกเป็นแพ็กเกจเดียว ได้คอร์สที่เกี่ยวข้องครบชุดในราคาที่ชัดเจน"
            actions={
              <ButtonLink href="/courses" size="sm" variant="outline">
                ดูเพิ่มเติม
              </ButtonLink>
            }
          />
          <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPackages.map((coursePackage) => (
              <ProductCard
                key={coursePackage.id}
                title={coursePackage.title}
                description={coursePackage.description}
                eyebrow="แพ็กเกจ"
                actionLabel="ดูรายละเอียด"
                href={`/courses/${coursePackage.slug}`}
                priceLabel={formatPrice(
                  coursePackage.priceCents,
                  coursePackage.currency,
                )}
                meta={
                  <span>
                    {coursePackage.courseCount} คอร์ส ·{" "}
                    {coursePackage.lessonCount} บทเรียน
                  </span>
                }
                footer={
                  <AddToCartButton
                    fullWidth
                    packageId={coursePackage.id}
                    size="sm"
                  />
                }
              />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-page py-10" id="courses">
          <SectionHeader
            eyebrow="Courses"
            title="คอร์สที่เปิดให้เรียน"
            description="ดูรายละเอียดคอร์สและเลือกแพ็กเกจที่รวมคอร์สเหล่านี้"
          />
          <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.map((course) => (
              <ProductCard
                key={course.id}
                title={course.title}
                description={course.description}
                eyebrow={course.level}
                badges={[course.category]}
                href={`/courses/${course.slug}`}
                actionLabel="ดูคอร์ส"
                meta={
                  <span>
                    {course.chapterCount} บท · {course.lessonCount} บทเรียน ·{" "}
                    {formatCompactDuration(course.durationSeconds)}
                  </span>
                }
                imageSrc={course.coverImageUrl}
              />
            ))}
          </div>
          {!featuredCourses.length ? (
            <p className="mt-6 rounded-card border border-line bg-surface p-6 text-center text-ink-muted">
              ยังไม่มีคอร์สที่ publish แล้ว
            </p>
          ) : null}
          <div className="mt-8 text-center">
            <Link
              className="text-sm font-bold text-primary-700 hover:text-primary-600"
              href="/courses"
            >
              เปิดหน้ารวมคอร์สและแพ็กเกจ
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
