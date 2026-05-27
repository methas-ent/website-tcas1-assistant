export const SUBJECT_CATEGORY_OPTIONS = [
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "Thai",
  "English",
  "Social",
  "TCAS",
  "A-Level",
  "Other",
] as const;

export const GRADE_LEVEL_OPTIONS = [
  "Primary",
  "Lower Secondary",
  "Upper Secondary",
  "M.4",
  "M.5",
  "M.6",
  "TCAS",
  "A-Level",
  "Other",
] as const;

export const TEACHER_OPTIONS = [
  "ทีมผู้สอน Knowledge Academy",
  "ครูคณิตศาสตร์",
  "ครูฟิสิกส์",
  "ครูเคมี",
  "ครูชีววิทยา",
  "ครูภาษาอังกฤษ",
  "ครูภาษาไทย",
  "ครูสังคมศึกษา",
  "ครูแนะแนว TCAS",
] as const;

export type SubjectCategory = (typeof SUBJECT_CATEGORY_OPTIONS)[number];
export type GradeLevel = (typeof GRADE_LEVEL_OPTIONS)[number];
export type TeacherName = (typeof TEACHER_OPTIONS)[number];

export const SUBJECT_CATEGORY_LABELS: Record<SubjectCategory, string> = {
  Math: "คณิตศาสตร์ (Math)",
  Physics: "ฟิสิกส์ (Physics)",
  Chemistry: "เคมี (Chemistry)",
  Biology: "ชีววิทยา (Biology)",
  Thai: "ภาษาไทย (Thai)",
  English: "ภาษาอังกฤษ (English)",
  Social: "สังคมศึกษา (Social)",
  TCAS: "TCAS",
  "A-Level": "A-Level",
  Other: "อื่นๆ (Other)",
};

export const GRADE_LEVEL_LABELS: Record<GradeLevel, string> = {
  Primary: "ประถมศึกษา (Primary)",
  "Lower Secondary": "มัธยมต้น (Lower Secondary)",
  "Upper Secondary": "มัธยมปลาย (Upper Secondary)",
  "M.4": "ม.4 (M.4)",
  "M.5": "ม.5 (M.5)",
  "M.6": "ม.6 (M.6)",
  TCAS: "TCAS",
  "A-Level": "A-Level",
  Other: "อื่นๆ (Other)",
};

const subjectAliases: Record<string, SubjectCategory> = {
  math: "Math",
  mathematics: "Math",
  "คณิต": "Math",
  "คณิตศาสตร์": "Math",
  physics: "Physics",
  "ฟิสิกส์": "Physics",
  chemistry: "Chemistry",
  "เคมี": "Chemistry",
  biology: "Biology",
  "ชีววิทยา": "Biology",
  thai: "Thai",
  "ภาษาไทย": "Thai",
  english: "English",
  "ภาษาอังกฤษ": "English",
  social: "Social",
  "สังคม": "Social",
  "สังคมศึกษา": "Social",
  tcas: "TCAS",
  "แนะแนวสอบเข้า": "TCAS",
  "สอบเข้า": "TCAS",
  "a-level": "A-Level",
  alevel: "A-Level",
};

const gradeAliases: Record<string, GradeLevel> = {
  primary: "Primary",
  "ประถม": "Primary",
  "ประถมศึกษา": "Primary",
  "lower secondary": "Lower Secondary",
  "มัธยมต้น": "Lower Secondary",
  "ม.ต้น": "Lower Secondary",
  "upper secondary": "Upper Secondary",
  "มัธยมปลาย": "Upper Secondary",
  "ม.ปลาย": "Upper Secondary",
  "m.4": "M.4",
  "ม.4": "M.4",
  m4: "M.4",
  "m.5": "M.5",
  "ม.5": "M.5",
  m5: "M.5",
  "m.6": "M.6",
  "ม.6": "M.6",
  m6: "M.6",
  tcas: "TCAS",
  "a-level": "A-Level",
  alevel: "A-Level",
};

function key(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

export function isSubjectCategory(value: string): value is SubjectCategory {
  return SUBJECT_CATEGORY_OPTIONS.includes(value as SubjectCategory);
}

export function isGradeLevel(value: string): value is GradeLevel {
  return GRADE_LEVEL_OPTIONS.includes(value as GradeLevel);
}

export function normalizeSubjectCategory(
  value?: string | null,
  fallback?: string | null,
): SubjectCategory {
  const primary = String(value ?? "").trim();
  const secondary = String(fallback ?? "").trim();

  if (isSubjectCategory(primary)) {
    return primary;
  }

  if (isSubjectCategory(secondary)) {
    return secondary;
  }

  return subjectAliases[key(primary)] ?? subjectAliases[key(secondary)] ?? "Other";
}

export function normalizeGradeLevel(
  value?: string | null,
  fallback?: string | null,
): GradeLevel {
  const primary = String(value ?? "").trim();
  const secondary = String(fallback ?? "").trim();

  if (isGradeLevel(primary)) {
    return primary;
  }

  if (isGradeLevel(secondary)) {
    return secondary;
  }

  return gradeAliases[key(primary)] ?? gradeAliases[key(secondary)] ?? "Other";
}

export function normalizeTeacherName(value?: string | null): TeacherName {
  const teacherName = String(value ?? "").trim();

  return TEACHER_OPTIONS.includes(teacherName as TeacherName)
    ? (teacherName as TeacherName)
    : TEACHER_OPTIONS[0];
}

export function getSubjectCategoryLabel(
  value?: string | null,
  fallback?: string | null,
) {
  return SUBJECT_CATEGORY_LABELS[normalizeSubjectCategory(value, fallback)];
}

export function getGradeLevelLabel(value?: string | null, fallback?: string | null) {
  return GRADE_LEVEL_LABELS[normalizeGradeLevel(value, fallback)];
}
