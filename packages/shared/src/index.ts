export type UserRole = "ADMIN" | "STUDENT";

export type MobileUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
};

export type MobileAuthResponse = {
  sessionToken: string;
  expiresAt: string;
  maxAgeSeconds: number;
  user: MobileUser;
};

export type MobileCourseListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  courseCode: string;
  coverImageUrl: string | null;
  progressPercent: number;
  chapterCount: number;
  lessonCount: number;
  totalDurationSeconds: number;
  completedLessonCount: number;
  expiresAt: string | null;
  continueLessonId: string | null;
};

export type MobileLessonListItem = {
  id: string;
  epNumber: number;
  title: string;
  description: string | null;
  durationSeconds: number | null;
  durationLabel: string;
  completed: boolean;
  progressSeconds: number;
  isPreview: boolean;
  locked: boolean;
};

export type MobileChapterDetail = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessonCount: number;
  completedLessonCount: number;
  totalDurationSeconds: number;
  lessons: MobileLessonListItem[];
};

export type MobileCourseDetail = MobileCourseListItem & {
  subtitle: string | null;
  chapters: MobileChapterDetail[];
};

export type MobileLessonAccessSource = "ENROLLMENT" | "PAY_TIME";

export type MobileLessonContext = {
  lesson: MobileLessonListItem;
  course: {
    id: string;
    slug: string;
    title: string;
    courseCode: string;
    subject: string;
  };
  chapter: {
    id: string;
    title: string;
    sortOrder: number;
  };
  chapters: MobileChapterDetail[];
  previousLessonId: string | null;
  nextLessonId: string | null;
  accessSource?: MobileLessonAccessSource;
  payTimeExpiresAt?: string | null;
};

export type PayTimeEligibilityCode =
  | "OK"
  | "NEVER_ENROLLED"
  | "NOT_ENABLED"
  | "LESSON_NOT_FOUND";

export type PayTimeStatusResponse = {
  eligibility: PayTimeEligibilityCode;
  lessonId: string;
  priceCents: number;
  hours: number;
  currency: string;
  description: string | null;
  activeExtension: {
    expiresAt: string;
    hoursGranted: number;
  } | null;
  pendingOrderId: string | null;
};

export type PayTimeOrderStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PayTimeOrderResponse = {
  order: {
    id: string;
    lessonId: string;
    status: PayTimeOrderStatus | string;
    priceCents: number;
    hours: number;
    currency: string;
    title: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    note: string | null;
    createdAt: string;
    approvedAt: string | null;
    rejectedAt: string | null;
    appliedAt: string | null;
    extension: {
      id: string;
      expiresAt: string;
      startsAt: string;
      hoursGranted: number;
      status: string;
    } | null;
  };
};

export type PayTimeOrderCreateResponse = {
  orderId: string;
  status: PayTimeOrderStatus | string;
  priceCents: number;
  hoursSnapshot: number;
  currency: string;
  expectedTotalThb: string;
};

export type PayTimeOrderSlipUpdateResponse = {
  orderId: string;
  status: PayTimeOrderStatus | string;
  paymentSlipUploadedAt: string | null;
};

export type PlaybackAuthorizeResponse = {
  playbackUrl: string;
  expiresAt: string;
  sessionId: string;
  lessonTitle: string;
  mimeType: string;
};

export type LessonProgressResponse = {
  progress: {
    lessonId: string;
    progressSeconds: number;
    completedAt: string | null;
  };
};

export type KnowledgeTheme = {
  colors: {
    brand: string;
    brandDark: string;
    brandSoft: string;
    ink: string;
    muted: string;
    border: string;
    surface: string;
    background: string;
    success: string;
    danger: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
};

export const knowledgeTheme: KnowledgeTheme = {
  colors: {
    brand: "#1d6fe8",
    brandDark: "#0f3f95",
    brandSoft: "#eaf3ff",
    ink: "#0f172a",
    muted: "#64748b",
    border: "#dbe6f5",
    surface: "#ffffff",
    background: "#f5f8fc",
    success: "#0f9f6e",
    danger: "#dc2626",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
  },
};
