-- Backfill normalized taxonomy values. The columns and indexes are created by
-- 20260521000000_add_course_subject_grade.
UPDATE "Course"
SET
  "subjectCategory" = CASE
    WHEN lower("category") LIKE '%math%' OR "category" LIKE '%คณิต%' THEN 'Math'
    WHEN lower("category") LIKE '%physics%' OR "category" LIKE '%ฟิสิกส์%' THEN 'Physics'
    WHEN lower("category") LIKE '%chemistry%' OR "category" LIKE '%เคมี%' THEN 'Chemistry'
    WHEN lower("category") LIKE '%biology%' OR "category" LIKE '%ชีว%' THEN 'Biology'
    WHEN lower("category") LIKE '%thai%' OR "category" LIKE '%ภาษาไทย%' THEN 'Thai'
    WHEN lower("category") LIKE '%english%' OR "category" LIKE '%อังกฤษ%' THEN 'English'
    WHEN lower("category") LIKE '%social%' OR "category" LIKE '%สังคม%' THEN 'Social'
    WHEN lower("category") LIKE '%tcas%' OR "category" LIKE '%แนะแนว%' THEN 'TCAS'
    WHEN lower("category") LIKE '%a-level%' THEN 'A-Level'
    ELSE 'Other'
  END,
  "gradeLevel" = CASE
    WHEN "level" IN ('Primary', 'Lower Secondary', 'Upper Secondary', 'M.4', 'M.5', 'M.6', 'TCAS', 'A-Level', 'Other') THEN "level"
    ELSE 'Other'
  END
WHERE "subjectCategory" = '' OR "gradeLevel" = '';
