"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CoursePackageCard } from "@/components/public/CoursePackageCard";
import { ProductCard } from "@/components/public/ProductCard";
import { AddToCartButton } from "@/components/public/AddToCartButton";
import { ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import type { StorefrontCourse, StorefrontPackage } from "@/lib/storefront";
import {
  formatCompactDuration,
  formatPrice,
} from "@/lib/storefront";

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
    <div className="grid gap-10">
      <section>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <Input
            label="ค้นหาคอร์ส"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="พิมพ์ชื่อคอร์ส วิชา หรือระดับ"
            value={query}
          />
          <Tabs
            label="หมวดหมู่คอร์ส"
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
      </section>

      <section id="packages">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-primary-700">แพ็กเกจยอดนิยม</p>
            <h2 className="font-heading text-2xl font-bold text-ink">
              เลือกแพ็กเกจที่เหมาะกับเป้าหมาย
            </h2>
          </div>
          <div className="hidden gap-2 text-2xl text-primary-700 sm:flex">
            <span aria-hidden="true">‹</span>
            <span aria-hidden="true">›</span>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {packages.map((coursePackage) => (
            <CoursePackageCard
              key={coursePackage.id}
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
              footer={<AddToCartButton packageId={coursePackage.id} size="sm" />}
            />
          ))}
        </div>
      </section>

      <section id="courses">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-primary-700">คอร์สทั้งหมด</p>
            <h2 className="font-heading text-2xl font-bold text-ink">
              เรียนเป็นรายคอร์สก่อนตัดสินใจเลือกแพ็กเกจ
            </h2>
          </div>
          <ButtonLink href="/cart" variant="outline" size="sm">
            ดูตะกร้า
          </ButtonLink>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <ProductCard
              key={course.id}
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
