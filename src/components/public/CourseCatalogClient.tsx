"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CoursePackageCard } from "@/components/public/CoursePackageCard";
import { ProductCard } from "@/components/public/ProductCard";
import { AddToCartButton } from "@/components/public/AddToCartButton";
import { ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import {
  formatCompactDuration,
  formatPrice,
} from "@/lib/formatters";
import type { StorefrontCourse, StorefrontPackage } from "@/lib/storefront";

type CourseCatalogClientProps = {
  categories: string[];
  courses: StorefrontCourse[];
  packages: StorefrontPackage[];
};

export function CourseCatalogClient({
  categories,
  courses,
  packages,
}: CourseCatalogClientProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesCategory = category === "all" || course.category === category;
      const matchesQuery =
        !normalizedQuery ||
        [course.title, course.description, course.category, course.level]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, courses, query]);

  return (
    <div className="grid gap-8 sm:gap-10">
      <section aria-label="ค้นหาและกรองคอร์ส">
        <div className="grid gap-4 rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <Input
            label="ค้นหาคอร์ส"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="พิมพ์ชื่อคอร์ส วิชา หรือระดับ"
            value={query}
          />
          <Tabs
            label="หมวดหมู่คอร์ส"
            className="min-w-0"
            value={category}
            onValueChange={setCategory}
            items={[
              { value: "all", label: "ทั้งหมด", content: null },
              ...categories.map((item) => ({
                value: item,
                label: item,
                content: null,
              })),
            ]}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink-muted">
          <span className="rounded-full bg-primary-50 px-3 py-1 text-primary-700">
            {filteredCourses.length} คอร์ส
          </span>
          <span className="rounded-full bg-surface-muted px-3 py-1">
            {packages.length} แพ็กเกจ
          </span>
        </div>
      </section>

      <section id="packages" className="min-w-0">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-primary-700">แพ็กเกจยอดนิยม</p>
            <h2 className="font-heading text-xl font-bold text-ink sm:text-2xl">
              เลือกแพ็กเกจที่เหมาะกับเป้าหมาย
            </h2>
          </div>
          <div className="flex gap-2 text-xl text-primary-700 sm:text-2xl">
            <span aria-hidden="true">‹</span>
            <span aria-hidden="true">›</span>
          </div>
        </div>
        <div className="grid auto-cols-[minmax(17rem,86vw)] grid-flow-col gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] sm:auto-cols-[minmax(20rem,48vw)] lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {packages.map((coursePackage) => (
            <CoursePackageCard
              key={coursePackage.id}
              className="h-full snap-start"
              title={coursePackage.title}
              description={coursePackage.description}
              priceLabel={formatPrice(
                coursePackage.priceCents,
                coursePackage.currency,
              )}
              courseCount={coursePackage.courseCount}
              lessonCount={coursePackage.lessonCount}
              durationLabel={formatCompactDuration(coursePackage.durationSeconds)}
              href={`/courses/${coursePackage.slug}`}
              featured
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

      <section id="courses" className="min-w-0">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-primary-700">คอร์สทั้งหมด</p>
            <h2 className="font-heading text-xl font-bold text-ink sm:text-2xl">
              เรียนเป็นรายคอร์สก่อนตัดสินใจเลือกแพ็กเกจ
            </h2>
          </div>
          <ButtonLink href="/cart" variant="outline" size="sm" className="w-full sm:w-auto">
            ดูตะกร้า
          </ButtonLink>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {filteredCourses.map((course) => (
            <ProductCard
              key={course.id}
              className="h-full"
              title={course.title}
              description={course.description}
              eyebrow={course.level}
              badges={[course.category]}
              href={`/courses/${course.slug}`}
              actionLabel="ดูรายละเอียด"
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
        {!filteredCourses.length ? (
          <p className="mt-6 rounded-card border border-line bg-surface p-6 text-center text-sm text-ink-muted">
            ไม่พบคอร์สตามเงื่อนไขที่ค้นหา{" "}
            <Link className="font-bold text-primary-700" href="/courses">
              ดูทั้งหมด
            </Link>
          </p>
        ) : null}
      </section>
    </div>
  );
}
