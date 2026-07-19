-- CreateTable
CREATE TABLE "LessonQuestionThread" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "unreadForAdmin" BOOLEAN NOT NULL DEFAULT true,
    "unreadForStudent" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonQuestionThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonQuestionMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonQuestionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonQuestionThread_status_lastMessageAt_idx" ON "LessonQuestionThread"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "LessonQuestionThread_userId_lastMessageAt_idx" ON "LessonQuestionThread"("userId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "LessonQuestionThread_lessonId_userId_key" ON "LessonQuestionThread"("lessonId", "userId");

-- CreateIndex
CREATE INDEX "LessonQuestionMessage_threadId_createdAt_idx" ON "LessonQuestionMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "LessonQuestionMessage_senderRole_createdAt_idx" ON "LessonQuestionMessage"("senderRole", "createdAt");

-- AddForeignKey
ALTER TABLE "LessonQuestionThread" ADD CONSTRAINT "LessonQuestionThread_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonQuestionThread" ADD CONSTRAINT "LessonQuestionThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonQuestionMessage" ADD CONSTRAINT "LessonQuestionMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "LessonQuestionThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonQuestionMessage" ADD CONSTRAINT "LessonQuestionMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
