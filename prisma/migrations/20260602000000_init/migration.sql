-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "subjectCategory" TEXT NOT NULL DEFAULT '',
    "gradeLevel" TEXT NOT NULL DEFAULT '',
    "teacherName" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "level" TEXT NOT NULL DEFAULT '',
    "coverImageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "courseCode" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER,
    "videoAssetId" TEXT,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "epNumber" INTEGER NOT NULL DEFAULT 0,
    "payTimeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payTimePriceCents" INTEGER NOT NULL DEFAULT 0,
    "payTimeHours" INTEGER NOT NULL DEFAULT 24,
    "payTimeDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAsset" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "durationSeconds" INTEGER,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursePackage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "coverImageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoursePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursePackageItem" (
    "packageId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoursePackageItem_pkey" PRIMARY KEY ("packageId","courseId")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "note" TEXT,
    "paymentSlipStorageKey" TEXT,
    "paymentSlipOriginalFileName" TEXT,
    "paymentSlipMimeType" TEXT,
    "paymentSlipSizeBytes" INTEGER,
    "paymentSlipUploadedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "packageId" TEXT,
    "courseId" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "priceCentsSnapshot" INTEGER NOT NULL,
    "courseIdsSnapshotJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userKey" TEXT NOT NULL DEFAULT 'demo-user',
    "courseId" TEXT NOT NULL,
    "percentComplete" INTEGER NOT NULL DEFAULT 0,
    "lastLessonId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userKey" TEXT NOT NULL DEFAULT 'demo-user',
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "progressSeconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybackSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userKey" TEXT NOT NULL DEFAULT 'demo-user',
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "deviceFingerprintHash" TEXT,
    "ipHash" TEXT,
    "userAgentHash" TEXT,

    CONSTRAINT "PlaybackSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayTimeOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "courseIdSnapshot" TEXT NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "priceCentsSnapshot" INTEGER NOT NULL,
    "hoursSnapshot" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentSlipStorageKey" TEXT,
    "paymentSlipOriginalFileName" TEXT,
    "paymentSlipMimeType" TEXT,
    "paymentSlipSizeBytes" INTEGER,
    "paymentSlipUploadedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayTimeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAccessExtension" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "payTimeOrderId" TEXT NOT NULL,
    "hoursGranted" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAccessExtension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionTokenHash_key" ON "Session"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_isPublished_idx" ON "Course"("isPublished");

-- CreateIndex
CREATE INDEX "Course_subjectCategory_idx" ON "Course"("subjectCategory");

-- CreateIndex
CREATE INDEX "Course_gradeLevel_idx" ON "Course"("gradeLevel");

-- CreateIndex
CREATE INDEX "Course_category_idx" ON "Course"("category");

-- CreateIndex
CREATE INDEX "Course_courseCode_idx" ON "Course"("courseCode");

-- CreateIndex
CREATE INDEX "Chapter_courseId_sortOrder_idx" ON "Chapter"("courseId", "sortOrder");

-- CreateIndex
CREATE INDEX "Chapter_isPublished_idx" ON "Chapter"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_courseId_slug_key" ON "Chapter"("courseId", "slug");

-- CreateIndex
CREATE INDEX "Lesson_courseId_sortOrder_idx" ON "Lesson"("courseId", "sortOrder");

-- CreateIndex
CREATE INDEX "Lesson_chapterId_sortOrder_idx" ON "Lesson"("chapterId", "sortOrder");

-- CreateIndex
CREATE INDEX "Lesson_videoAssetId_idx" ON "Lesson"("videoAssetId");

-- CreateIndex
CREATE INDEX "Lesson_isPublished_idx" ON "Lesson"("isPublished");

-- CreateIndex
CREATE INDEX "Lesson_payTimeEnabled_idx" ON "Lesson"("payTimeEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_chapterId_epNumber_key" ON "Lesson"("chapterId", "epNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAsset_storageKey_key" ON "VideoAsset"("storageKey");

-- CreateIndex
CREATE INDEX "VideoAsset_storageProvider_status_idx" ON "VideoAsset"("storageProvider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CoursePackage_slug_key" ON "CoursePackage"("slug");

-- CreateIndex
CREATE INDEX "CoursePackage_isPublished_idx" ON "CoursePackage"("isPublished");

-- CreateIndex
CREATE INDEX "CoursePackageItem_packageId_sortOrder_idx" ON "CoursePackageItem"("packageId", "sortOrder");

-- CreateIndex
CREATE INDEX "CoursePackageItem_courseId_idx" ON "CoursePackageItem"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentSlipStorageKey_key" ON "Order"("paymentSlipStorageKey");

-- CreateIndex
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_packageId_idx" ON "OrderItem"("packageId");

-- CreateIndex
CREATE INDEX "OrderItem_courseId_idx" ON "OrderItem"("courseId");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_status_idx" ON "Enrollment"("courseId", "status");

-- CreateIndex
CREATE INDEX "Enrollment_orderId_idx" ON "Enrollment"("orderId");

-- CreateIndex
CREATE INDEX "Enrollment_orderItemId_idx" ON "Enrollment"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");

-- CreateIndex
CREATE INDEX "CourseProgress_userKey_courseId_idx" ON "CourseProgress"("userKey", "courseId");

-- CreateIndex
CREATE INDEX "CourseProgress_userId_courseId_idx" ON "CourseProgress"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseProgress_userKey_courseId_key" ON "CourseProgress"("userKey", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseProgress_userId_courseId_key" ON "CourseProgress"("userId", "courseId");

-- CreateIndex
CREATE INDEX "LessonProgress_userKey_lessonId_idx" ON "LessonProgress"("userKey", "lessonId");

-- CreateIndex
CREATE INDEX "LessonProgress_userId_lessonId_idx" ON "LessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userKey_lessonId_key" ON "LessonProgress"("userKey", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "PlaybackSession_userKey_lessonId_status_idx" ON "PlaybackSession"("userKey", "lessonId", "status");

-- CreateIndex
CREATE INDEX "PlaybackSession_userId_lessonId_status_idx" ON "PlaybackSession"("userId", "lessonId", "status");

-- CreateIndex
CREATE INDEX "PlaybackSession_status_idx" ON "PlaybackSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PayTimeOrder_paymentSlipStorageKey_key" ON "PayTimeOrder"("paymentSlipStorageKey");

-- CreateIndex
CREATE INDEX "PayTimeOrder_userId_status_idx" ON "PayTimeOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "PayTimeOrder_lessonId_status_idx" ON "PayTimeOrder"("lessonId", "status");

-- CreateIndex
CREATE INDEX "PayTimeOrder_status_createdAt_idx" ON "PayTimeOrder"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAccessExtension_payTimeOrderId_key" ON "VideoAccessExtension"("payTimeOrderId");

-- CreateIndex
CREATE INDEX "VideoAccessExtension_userId_lessonId_expiresAt_idx" ON "VideoAccessExtension"("userId", "lessonId", "expiresAt");

-- CreateIndex
CREATE INDEX "VideoAccessExtension_lessonId_status_idx" ON "VideoAccessExtension"("lessonId", "status");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePackageItem" ADD CONSTRAINT "CoursePackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePackageItem" ADD CONSTRAINT "CoursePackageItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseProgress" ADD CONSTRAINT "CourseProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseProgress" ADD CONSTRAINT "CourseProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackSession" ADD CONSTRAINT "PlaybackSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackSession" ADD CONSTRAINT "PlaybackSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayTimeOrder" ADD CONSTRAINT "PayTimeOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayTimeOrder" ADD CONSTRAINT "PayTimeOrder_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayTimeOrder" ADD CONSTRAINT "PayTimeOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayTimeOrder" ADD CONSTRAINT "PayTimeOrder_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAccessExtension" ADD CONSTRAINT "VideoAccessExtension_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAccessExtension" ADD CONSTRAINT "VideoAccessExtension_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAccessExtension" ADD CONSTRAINT "VideoAccessExtension_payTimeOrderId_fkey" FOREIGN KEY ("payTimeOrderId") REFERENCES "PayTimeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

