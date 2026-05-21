-- Align the DB contract with Prompt 4 field names while preserving existing
-- local catalog/progress rows from the earlier learning-shell schema.

PRAGMA foreign_keys=OFF;

-- User.name is required by the LMS auth model.
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("id", "name", "email", "passwordHash", "role", "createdAt", "updatedAt")
SELECT "id", COALESCE("name", "email"), "email", "passwordHash", "role", "createdAt", "updatedAt"
FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE TABLE "new_Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "level" TEXT NOT NULL DEFAULT '',
    "coverImageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "courseCode" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Course" (
    "id", "slug", "title", "subtitle", "description", "category", "level",
    "coverImageUrl", "isPublished", "courseCode", "subject", "priceCents",
    "currency", "createdAt", "updatedAt"
)
SELECT
    "id",
    "slug",
    "title",
    COALESCE("level", ''),
    COALESCE("description", ''),
    COALESCE("subject", ''),
    COALESCE("level", ''),
    "coverImageUrl",
    CASE WHEN "status" = 'PUBLISHED' THEN true ELSE false END,
    "courseCode",
    COALESCE("subject", ''),
    "priceSatang",
    'THB',
    "createdAt",
    "updatedAt"
FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";

CREATE TABLE "new_Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Chapter" (
    "id", "courseId", "slug", "title", "description", "sortOrder",
    "isPublished", "createdAt", "updatedAt"
)
SELECT
    "id",
    "courseId",
    "slug",
    "title",
    NULL,
    "sortOrder",
    CASE WHEN "status" = 'PUBLISHED' THEN true ELSE false END,
    "createdAt",
    "updatedAt"
FROM "Chapter";
DROP TABLE "Chapter";
ALTER TABLE "new_Chapter" RENAME TO "Chapter";

CREATE TABLE "new_VideoAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "durationSeconds" INTEGER,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_VideoAsset" (
    "id", "title", "storageProvider", "storageKey", "originalFileName",
    "mimeType", "sizeBytes", "status", "durationSeconds", "metadataJson",
    "createdAt", "updatedAt"
)
SELECT
    "id",
    'Seed video asset',
    "storageProvider",
    "storageKey",
    "storageKey",
    'video/mp4',
    0,
    "status",
    "durationSeconds",
    "metadataJson",
    "createdAt",
    "updatedAt"
FROM "VideoAsset";
DROP TABLE "VideoAsset";
ALTER TABLE "new_VideoAsset" RENAME TO "VideoAsset";

CREATE TABLE "new_Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lesson_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lesson_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lesson" (
    "id", "courseId", "chapterId", "title", "description", "sortOrder",
    "durationSeconds", "videoAssetId", "isPreview", "isPublished", "epNumber",
    "createdAt", "updatedAt"
)
SELECT
    "id",
    "courseId",
    "chapterId",
    "title",
    "description",
    "sortOrder",
    "durationSeconds",
    "videoAssetId",
    CASE WHEN "sortOrder" = 1 THEN true ELSE false END,
    CASE WHEN "status" = 'PUBLISHED' THEN true ELSE false END,
    "epNumber",
    "createdAt",
    "updatedAt"
FROM "Lesson";
DROP TABLE "Lesson";
ALTER TABLE "new_Lesson" RENAME TO "Lesson";

CREATE TABLE "new_CoursePackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "coverImageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CoursePackage" (
    "id", "slug", "title", "description", "priceCents", "currency",
    "coverImageUrl", "isPublished", "createdAt", "updatedAt"
)
SELECT
    "id",
    "slug",
    "title",
    COALESCE("description", ''),
    "priceSatang",
    'THB',
    "coverImageUrl",
    CASE WHEN "status" = 'PUBLISHED' THEN true ELSE false END,
    "createdAt",
    "updatedAt"
FROM "CoursePackage";
DROP TABLE "CoursePackage";
ALTER TABLE "new_CoursePackage" RENAME TO "CoursePackage";

CREATE TABLE "new_CoursePackageItem" (
    "packageId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoursePackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoursePackageItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("packageId", "courseId")
);
INSERT INTO "new_CoursePackageItem" ("packageId", "courseId", "sortOrder", "createdAt")
SELECT "coursePackageId", "courseId", "sortOrder", "createdAt"
FROM "CoursePackageItem";
DROP TABLE "CoursePackageItem";
ALTER TABLE "new_CoursePackageItem" RENAME TO "CoursePackageItem";

CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "note" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" (
    "id", "userId", "status", "totalCents", "currency", "customerName",
    "customerEmail", "customerPhone", "note", "paidAt", "createdAt", "updatedAt"
)
SELECT
    "Order"."id",
    "Order"."userId",
    "Order"."status",
    "Order"."totalSatang",
    "Order"."currency",
    COALESCE((SELECT "name" FROM "User" WHERE "User"."id" = "Order"."userId"), 'Unknown Customer'),
    COALESCE((SELECT "email" FROM "User" WHERE "User"."id" = "Order"."userId"), 'unknown@example.com'),
    NULL,
    NULL,
    "Order"."paidAt",
    "Order"."createdAt",
    "Order"."updatedAt"
FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";

CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "priceCentsSnapshot" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" (
    "id", "orderId", "packageId", "titleSnapshot", "priceCentsSnapshot", "createdAt"
)
SELECT
    "id",
    "orderId",
    "coursePackageId",
    "titleSnapshot",
    "unitPriceSatang",
    "createdAt"
FROM "OrderItem"
WHERE "coursePackageId" IS NOT NULL;
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";

CREATE TABLE "new_Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Enrollment" (
    "id", "userId", "courseId", "orderId", "orderItemId", "status",
    "expiresAt", "createdAt", "updatedAt"
)
SELECT
    "id",
    "userId",
    "courseId",
    "orderId",
    "orderItemId",
    "status",
    "expiresAt",
    "createdAt",
    "updatedAt"
FROM "Enrollment";
DROP TABLE "Enrollment";
ALTER TABLE "new_Enrollment" RENAME TO "Enrollment";

CREATE TABLE "new_LessonProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userKey" TEXT NOT NULL DEFAULT 'demo-user',
    "lessonId" TEXT NOT NULL,
    "completedAt" DATETIME,
    "progressSeconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LessonProgress" (
    "id", "userId", "userKey", "lessonId", "completedAt", "progressSeconds", "updatedAt"
)
SELECT
    "id",
    "userId",
    "userKey",
    "lessonId",
    CASE WHEN "completed" THEN "updatedAt" ELSE NULL END,
    "secondsWatched",
    "updatedAt"
FROM "LessonProgress";
DROP TABLE "LessonProgress";
ALTER TABLE "new_LessonProgress" RENAME TO "LessonProgress";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE INDEX "Course_isPublished_idx" ON "Course"("isPublished");
CREATE INDEX "Course_category_idx" ON "Course"("category");
CREATE INDEX "Course_courseCode_idx" ON "Course"("courseCode");

CREATE INDEX "Chapter_courseId_sortOrder_idx" ON "Chapter"("courseId", "sortOrder");
CREATE INDEX "Chapter_isPublished_idx" ON "Chapter"("isPublished");
CREATE UNIQUE INDEX "Chapter_courseId_slug_key" ON "Chapter"("courseId", "slug");

CREATE UNIQUE INDEX "Lesson_chapterId_epNumber_key" ON "Lesson"("chapterId", "epNumber");
CREATE INDEX "Lesson_courseId_sortOrder_idx" ON "Lesson"("courseId", "sortOrder");
CREATE INDEX "Lesson_chapterId_sortOrder_idx" ON "Lesson"("chapterId", "sortOrder");
CREATE INDEX "Lesson_videoAssetId_idx" ON "Lesson"("videoAssetId");
CREATE INDEX "Lesson_isPublished_idx" ON "Lesson"("isPublished");

CREATE UNIQUE INDEX "VideoAsset_storageKey_key" ON "VideoAsset"("storageKey");
CREATE INDEX "VideoAsset_storageProvider_status_idx" ON "VideoAsset"("storageProvider", "status");

CREATE UNIQUE INDEX "CoursePackage_slug_key" ON "CoursePackage"("slug");
CREATE INDEX "CoursePackage_isPublished_idx" ON "CoursePackage"("isPublished");

CREATE INDEX "CoursePackageItem_packageId_sortOrder_idx" ON "CoursePackageItem"("packageId", "sortOrder");
CREATE INDEX "CoursePackageItem_courseId_idx" ON "CoursePackageItem"("courseId");

CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_packageId_idx" ON "OrderItem"("packageId");

CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");
CREATE INDEX "Enrollment_courseId_status_idx" ON "Enrollment"("courseId", "status");
CREATE INDEX "Enrollment_orderId_idx" ON "Enrollment"("orderId");
CREATE INDEX "Enrollment_orderItemId_idx" ON "Enrollment"("orderItemId");

CREATE INDEX "LessonProgress_userKey_lessonId_idx" ON "LessonProgress"("userKey", "lessonId");
CREATE INDEX "LessonProgress_userId_lessonId_idx" ON "LessonProgress"("userId", "lessonId");
CREATE UNIQUE INDEX "LessonProgress_userKey_lessonId_key" ON "LessonProgress"("userKey", "lessonId");
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");

PRAGMA foreign_keys=ON;
