ALTER TABLE "Course" ADD COLUMN "subjectCategory" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Course" ADD COLUMN "gradeLevel" TEXT NOT NULL DEFAULT '';

UPDATE "Course"
SET "subjectCategory" = CASE COALESCE(NULLIF("category", ''), NULLIF("subject", ''), '')
  WHEN 'Math' THEN 'Math'
  WHEN 'คณิต' THEN 'Math'
  WHEN 'คณิตศาสตร์' THEN 'Math'
  WHEN 'Physics' THEN 'Physics'
  WHEN 'ฟิสิกส์' THEN 'Physics'
  WHEN 'Chemistry' THEN 'Chemistry'
  WHEN 'เคมี' THEN 'Chemistry'
  WHEN 'Biology' THEN 'Biology'
  WHEN 'ชีววิทยา' THEN 'Biology'
  WHEN 'Thai' THEN 'Thai'
  WHEN 'ภาษาไทย' THEN 'Thai'
  WHEN 'English' THEN 'English'
  WHEN 'ภาษาอังกฤษ' THEN 'English'
  WHEN 'Social' THEN 'Social'
  WHEN 'สังคม' THEN 'Social'
  WHEN 'สังคมศึกษา' THEN 'Social'
  WHEN 'TCAS' THEN 'TCAS'
  WHEN 'แนะแนวสอบเข้า' THEN 'TCAS'
  WHEN 'A-Level' THEN 'A-Level'
  ELSE 'Other'
END;

UPDATE "Course"
SET "gradeLevel" = CASE COALESCE(NULLIF("level", ''), NULLIF("subtitle", ''), '')
  WHEN 'Primary' THEN 'Primary'
  WHEN 'ประถม' THEN 'Primary'
  WHEN 'ประถมศึกษา' THEN 'Primary'
  WHEN 'Lower Secondary' THEN 'Lower Secondary'
  WHEN 'มัธยมต้น' THEN 'Lower Secondary'
  WHEN 'ม.ต้น' THEN 'Lower Secondary'
  WHEN 'Upper Secondary' THEN 'Upper Secondary'
  WHEN 'มัธยมปลาย' THEN 'Upper Secondary'
  WHEN 'ม.ปลาย' THEN 'Upper Secondary'
  WHEN 'M.4' THEN 'M.4'
  WHEN 'ม.4' THEN 'M.4'
  WHEN 'M.5' THEN 'M.5'
  WHEN 'ม.5' THEN 'M.5'
  WHEN 'M.6' THEN 'M.6'
  WHEN 'ม.6' THEN 'M.6'
  WHEN 'TCAS' THEN 'TCAS'
  WHEN 'A-Level' THEN 'A-Level'
  ELSE 'Other'
END;

CREATE INDEX "Course_subjectCategory_idx" ON "Course"("subjectCategory");
CREATE INDEX "Course_gradeLevel_idx" ON "Course"("gradeLevel");
