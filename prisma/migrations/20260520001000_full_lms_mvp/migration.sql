-- Full LMS MVP schema evolution.
-- Keeps existing catalog/progress data where possible and avoids raw video URLs.

PRAGMA foreign_keys=OFF;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoursePackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "priceSatang" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CoursePackageItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coursePackageId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoursePackageItem_coursePackageId_fkey" FOREIGN KEY ("coursePackageId") REFERENCES "CoursePackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoursePackageItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "subtotalSatang" INTEGER NOT NULL DEFAULT 0,
    "discountSatang" INTEGER NOT NULL DEFAULT 0,
    "totalSatang" INTEGER NOT NULL DEFAULT 0,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "courseId" TEXT,
    "coursePackageId" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "unitPriceSatang" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalSatang" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_coursePackageId_fkey" FOREIGN KEY ("coursePackageId") REFERENCES "CoursePackage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "priceSatang" INTEGER NOT NULL DEFAULT 0;

-- RedefineTables
CREATE TABLE "new_Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Chapter" ("id", "courseId", "slug", "title", "sortOrder", "status", "createdAt", "updatedAt")
SELECT "id", "courseId", "slug", "title", "sortOrder", "status", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Module";
DROP TABLE "Module";
ALTER TABLE "new_Chapter" RENAME TO "Chapter";

CREATE TABLE "new_VideoAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "storageKey" TEXT NOT NULL,
    "metadataJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "durationSeconds" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_VideoAsset" ("id", "storageProvider", "storageKey", "metadataJson", "status", "durationSeconds", "createdAt", "updatedAt")
SELECT
    "id",
    CASE
        WHEN lower("provider") = 'local' THEN 'LOCAL'
        WHEN lower("provider") = 's3' THEN 'S3'
        WHEN lower("provider") = 'r2' THEN 'R2'
        ELSE 'CLOUD'
    END,
    'legacy/' || "id",
    NULL,
    CASE
        WHEN "uploadStatus" = 'PROCESSING' THEN 'PROCESSING'
        WHEN "uploadStatus" = 'READY' THEN 'READY'
        WHEN "uploadStatus" = 'FAILED' THEN 'FAILED'
        ELSE 'UPLOADED'
    END,
    "durationSeconds",
    "createdAt",
    "updatedAt"
FROM "VideoAsset";
DROP TABLE "VideoAsset";
ALTER TABLE "new_VideoAsset" RENAME TO "VideoAsset";

CREATE TABLE "new_Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "epNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "videoAssetId" TEXT,
    "durationSeconds" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lesson_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lesson_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lesson" ("id", "courseId", "chapterId", "epNumber", "title", "description", "sortOrder", "status", "videoAssetId", "durationSeconds", "createdAt", "updatedAt")
SELECT "id", "courseId", "moduleId", "epNumber", "title", "description", "sortOrder", "status", "videoAssetId", "durationSeconds", "createdAt", "updatedAt" FROM "Lesson";
DROP TABLE "Lesson";
ALTER TABLE "new_Lesson" RENAME TO "Lesson";

CREATE TABLE "new_CourseProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userKey" TEXT NOT NULL DEFAULT 'demo-user',
    "courseId" TEXT NOT NULL,
    "percentComplete" INTEGER NOT NULL DEFAULT 0,
    "lastLessonId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourseProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CourseProgress" ("id", "userKey", "courseId", "percentComplete", "lastLessonId", "updatedAt")
SELECT "id", "userKey", "courseId", "percentComplete", "lastLessonId", "updatedAt" FROM "CourseProgress";
DROP TABLE "CourseProgress";
ALTER TABLE "new_CourseProgress" RENAME TO "CourseProgress";

CREATE TABLE "new_LessonProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userKey" TEXT NOT NULL DEFAULT 'demo-user',
    "lessonId" TEXT NOT NULL,
    "secondsWatched" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LessonProgress" ("id", "userKey", "lessonId", "secondsWatched", "completed", "updatedAt")
SELECT "id", "userKey", "lessonId", "secondsWatched", "completed", "updatedAt" FROM "LessonProgress";
DROP TABLE "LessonProgress";
ALTER TABLE "new_LessonProgress" RENAME TO "LessonProgress";

CREATE TABLE "new_PlaybackSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userKey" TEXT NOT NULL DEFAULT 'demo-user',
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" DATETIME,
    "endedAt" DATETIME,
    "deviceFingerprintHash" TEXT,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    CONSTRAINT "PlaybackSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlaybackSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlaybackSession" ("id", "userKey", "lessonId", "status", "startedAt", "lastHeartbeatAt", "endedAt", "deviceFingerprintHash", "ipHash")
SELECT "id", "userKey", "lessonId", "status", "startedAt", "lastHeartbeatAt", "endedAt", "deviceFingerprintHash", "ipHash" FROM "PlaybackSession";
DROP TABLE "PlaybackSession";
ALTER TABLE "new_PlaybackSession" RENAME TO "PlaybackSession";

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE UNIQUE INDEX "Session_sessionTokenHash_key" ON "Session"("sessionTokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE INDEX "Chapter_courseId_sortOrder_idx" ON "Chapter"("courseId", "sortOrder");
CREATE UNIQUE INDEX "Chapter_courseId_slug_key" ON "Chapter"("courseId", "slug");

CREATE UNIQUE INDEX "Lesson_chapterId_epNumber_key" ON "Lesson"("chapterId", "epNumber");
CREATE INDEX "Lesson_courseId_sortOrder_idx" ON "Lesson"("courseId", "sortOrder");
CREATE INDEX "Lesson_chapterId_sortOrder_idx" ON "Lesson"("chapterId", "sortOrder");
CREATE INDEX "Lesson_videoAssetId_idx" ON "Lesson"("videoAssetId");

CREATE UNIQUE INDEX "VideoAsset_storageKey_key" ON "VideoAsset"("storageKey");
CREATE INDEX "VideoAsset_storageProvider_status_idx" ON "VideoAsset"("storageProvider", "status");

CREATE UNIQUE INDEX "CoursePackage_slug_key" ON "CoursePackage"("slug");
CREATE INDEX "CoursePackage_status_idx" ON "CoursePackage"("status");

CREATE INDEX "CoursePackageItem_coursePackageId_sortOrder_idx" ON "CoursePackageItem"("coursePackageId", "sortOrder");
CREATE INDEX "CoursePackageItem_courseId_idx" ON "CoursePackageItem"("courseId");
CREATE UNIQUE INDEX "CoursePackageItem_coursePackageId_courseId_key" ON "CoursePackageItem"("coursePackageId", "courseId");

CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_courseId_idx" ON "OrderItem"("courseId");
CREATE INDEX "OrderItem_coursePackageId_idx" ON "OrderItem"("coursePackageId");

CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");
CREATE INDEX "Enrollment_courseId_status_idx" ON "Enrollment"("courseId", "status");
CREATE INDEX "Enrollment_orderId_idx" ON "Enrollment"("orderId");
CREATE INDEX "Enrollment_orderItemId_idx" ON "Enrollment"("orderItemId");

CREATE INDEX "CourseProgress_userKey_courseId_idx" ON "CourseProgress"("userKey", "courseId");
CREATE INDEX "CourseProgress_userId_courseId_idx" ON "CourseProgress"("userId", "courseId");
CREATE UNIQUE INDEX "CourseProgress_userKey_courseId_key" ON "CourseProgress"("userKey", "courseId");
CREATE UNIQUE INDEX "CourseProgress_userId_courseId_key" ON "CourseProgress"("userId", "courseId");

CREATE INDEX "LessonProgress_userKey_lessonId_idx" ON "LessonProgress"("userKey", "lessonId");
CREATE INDEX "LessonProgress_userId_lessonId_idx" ON "LessonProgress"("userId", "lessonId");
CREATE UNIQUE INDEX "LessonProgress_userKey_lessonId_key" ON "LessonProgress"("userKey", "lessonId");
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");

CREATE INDEX "PlaybackSession_userKey_lessonId_status_idx" ON "PlaybackSession"("userKey", "lessonId", "status");
CREATE INDEX "PlaybackSession_userId_lessonId_status_idx" ON "PlaybackSession"("userId", "lessonId", "status");
CREATE INDEX "PlaybackSession_status_idx" ON "PlaybackSession"("status");

PRAGMA foreign_keys=ON;
