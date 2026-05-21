"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CoursePackageCard } from "@/components/public/CoursePackageCard";
import { ProductCard } from "@/components/public/ProductCard";
import { AddToCartButton } from "@/components/public/AddToCartButton";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  getGradeLevelLabel,
  getSubjectCategoryLabel,
  normalizeGradeLevel,
  normalizeSubjectCategory,
} from "@/lib/course-taxonomy";
import {
  formatCompactDuration,
  formatPrice,
} from "@/lib/formatters";
import type { StorefrontCourse, StorefrontPackage } from "@/lib/storefront";

type CourseCatalogClientProps = {
  courses: StorefrontCourse[];
  packages: StorefrontPackage[];
};

export function CourseCatalogClient({
  courses,
  packages,
}: CourseCatalogClientProps) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [gradeLevel, setGradeLevel] = useState("all");

  const subjectOptions = useMemo(() => {
    const optionMap = new Map<string, string>();

    courses.forEach((course) => {
      const value = normalizeSubjectCategory(
        course.subjectCategory,
        course.category || course.subject,
      );
      optionMap.set(
        value,
        getSubjectCategoryLabel(
          course.subjectCategory,
          course.category || course.subject,
        ),
      );
    });

    return Array.from(optionMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "th"));
  }, [courses]);

  const gradeLevelOptions = useMemo(() => {
    const optionMap = new Map<string, string>();

    courses.forEach((course) => {
      const value = normalizeGradeLevel(course.gradeLevel, course.level);
      optionMap.set(value, getGradeLevelLabel(course.gradeLevel, course.level));
    });

    return Array.from(optionMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "th"));
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return courses.filter((course) => {
      const courseSubject = normalizeSubjectCategory(
        course.subjectCategory,
        course.category || course.subject,
      );
      const courseGradeLevel = normalizeGradeLevel(
        course.gradeLevel,
        course.level,
      );
      const matchesSubject = subject === "all" || courseSubject === subject;
      const matchesGradeLevel =
        gradeLevel === "all" || courseGradeLevel === gradeLevel;
      const matchesQuery =
        !normalizedQuery ||
        [
          course.title,
          course.description,
          course.category,
          course.subjectCategory,
          course.subject,
          course.level,
          course.gradeLevel,
          getSubjectCategoryLabel(
            course.subjectCategory,
            course.category || course.subject,
          ),
          getGradeLevelLabel(course.gradeLevel, course.level),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesSubject && matchesGradeLevel && matchesQuery;
    });
  }, [courses, gradeLevel, query, subject]);

  const filteredPackages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const hasTaxonomyFilter = subject !== "all" || gradeLevel !== "all";

    return packages.filter((coursePackage) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          coursePackage.title,
          coursePackage.description,
          ...coursePackage.courses.flatMap((course) => [
            course.title,
            course.description,
            course.category,
            course.subjectCategory,
            course.subject,
            course.level,
            course.gradeLevel,
          ]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesTaxonomy =
        !hasTaxonomyFilter ||
        coursePackage.courses.some((course) => {
          const courseSubject = normalizeSubjectCategory(
            course.subjectCategory,
            course.category || course.subject,
          );
          const courseGradeLevel = normalizeGradeLevel(
            course.gradeLevel,
            course.level,
          );

          return (
            (subject === "all" || courseSubject === subject) &&
            (gradeLevel === "all" || courseGradeLevel === gradeLevel)
          );
        });

      return matchesQuery && matchesTaxonomy;
    });
  }, [gradeLevel, packages, query, subject]);

  const hasActiveFilters =
    query.trim().length > 0 || subject !== "all" || gradeLevel !== "all";

  function clearFilters() {
    setQuery("");
    setSubject("all");
    setGradeLevel("all");
  }

  return (
    <div className="grid gap-8 sm:gap-10">
      <section aria-label="ค้นหาและกรองคอร์ส">
        <div className="grid gap-4 rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto] lg:items-end">
          <Input
            label="ค้นหาคอร์ส"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="พิมพ์ชื่อคอร์ส วิชา หรือระดับ"
            value={query}
          />
          <Select
            label="วิชา"
            onChange={(event) => setSubject(event.target.value)}
            value={subject}
          >
            <option value="all">ทุกวิชา</option>
            {subjectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="ระดับชั้น"
            onChange={(event) => setGradeLevel(event.target.value)}
            value={gradeLevel}
          >
            <option value="all">ทุกระดับชั้น</option>
            {gradeLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button
            className="w-full lg:w-auto"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
            type="button"
            variant="outline"
          >
            ล้างตัวกรอง
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink-muted">
          <span className="rounded-full bg-primary-50 px-3 py-1 text-primary-700">
            {filteredCourses.length} คอร์ส
          </span>
          <span className="rounded-full bg-surface-muted px-3 py-1">
            {filteredPackages.length} แพ็กเกจ
          </span>
          {hasActiveFilters ? (
            <span className="rounded-full bg-surface-muted px-3 py-1">
              กำลังกรองจากข้อมูลคอร์สที่เปิดขายจริง
            </span>
          ) : null}
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
          {filteredPackages.map((coursePackage) => (
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
        {!filteredPackages.length ? (
          <p className="mt-6 rounded-card border border-line bg-surface p-6 text-center text-sm text-ink-muted">
            ไม่พบแพ็กเกจตามตัวกรองนี้
          </p>
        ) : null}
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
              eyebrow={getGradeLevelLabel(course.gradeLevel, course.level)}
              badges={[
                getSubjectCategoryLabel(
                  course.subjectCategory,
                  course.category || course.subject,
                ),
              ]}
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
