-- Pay Time (per-video viewing extension) — additive only.
-- Adds 4 columns to Lesson + 2 new tables (PayTimeOrder, VideoAccessExtension).
-- No data rewrites, no column drops, no destructive ALTERs on existing tables.

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN "payTimeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lesson" ADD COLUMN "payTimePriceCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Lesson" ADD COLUMN "payTimeHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "Lesson" ADD COLUMN "payTimeDescription" TEXT;

-- CreateIndex
CREATE INDEX "Lesson_payTimeEnabled_idx" ON "Lesson"("payTimeEnabled");

-- CreateTable
CREATE TABLE "PayTimeOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "paymentSlipUploadedAt" DATETIME,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "rejectedById" TEXT,
    "rejectedAt" DATETIME,
    "appliedAt" DATETIME,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayTimeOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayTimeOrder_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayTimeOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PayTimeOrder_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PayTimeOrder_paymentSlipStorageKey_key" ON "PayTimeOrder"("paymentSlipStorageKey");
CREATE INDEX "PayTimeOrder_userId_status_idx" ON "PayTimeOrder"("userId", "status");
CREATE INDEX "PayTimeOrder_lessonId_status_idx" ON "PayTimeOrder"("lessonId", "status");
CREATE INDEX "PayTimeOrder_status_createdAt_idx" ON "PayTimeOrder"("status", "createdAt");

-- CreateTable
CREATE TABLE "VideoAccessExtension" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "payTimeOrderId" TEXT NOT NULL,
    "hoursGranted" INTEGER NOT NULL,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoAccessExtension_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VideoAccessExtension_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VideoAccessExtension_payTimeOrderId_fkey" FOREIGN KEY ("payTimeOrderId") REFERENCES "PayTimeOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoAccessExtension_payTimeOrderId_key" ON "VideoAccessExtension"("payTimeOrderId");
CREATE INDEX "VideoAccessExtension_userId_lessonId_expiresAt_idx" ON "VideoAccessExtension"("userId", "lessonId", "expiresAt");
CREATE INDEX "VideoAccessExtension_lessonId_status_idx" ON "VideoAccessExtension"("lessonId", "status");
