/*
  Warnings:

  - You are about to drop the `lx_purchases` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `lessons` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ExamType" AS ENUM ('MCQ', 'ESSAY', 'MIXED');

-- CreateEnum
CREATE TYPE "public"."ExamResultStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('MCQ', 'ESSAY');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('PURCHASE', 'REFUND');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- AlterEnum
ALTER TYPE "course_mgmt"."LessonType" ADD VALUE 'LAB';

-- AlterTable
ALTER TABLE "course_mgmt"."lessons" ADD COLUMN     "aiMetadata" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'ARTICLE';

-- DropTable
DROP TABLE "lx"."lx_purchases";

-- CreateTable
CREATE TABLE "lx"."purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."certificates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentName" VARCHAR(255) NOT NULL,
    "courseTitle" VARCHAR(255) NOT NULL,
    "certificateUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."announcements" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exams" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "type" "public"."ExamType" NOT NULL DEFAULT 'MCQ',
    "duration" INTEGER NOT NULL DEFAULT 60,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exam_results" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DECIMAL(5,2),
    "totalQuestions" INTEGER NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "status" "public"."ExamResultStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankName" VARCHAR(100),
    "bankAccount" VARCHAR(50),
    "accountHolder" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."revenue_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "public"."QuestionType" NOT NULL DEFAULT 'MCQ',
    "options" JSONB,
    "correctAnswer" TEXT,
    "explanation" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "public"."TransactionType" NOT NULL DEFAULT 'PURCHASE',
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchases_userId_idx" ON "lx"."purchases"("userId");

-- CreateIndex
CREATE INDEX "purchases_courseId_idx" ON "lx"."purchases"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_userId_courseId_key" ON "lx"."purchases"("userId", "courseId");

-- CreateIndex
CREATE INDEX "favorites_userId_idx" ON "public"."favorites"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_courseId_key" ON "public"."favorites"("userId", "courseId");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "public"."reviews"("userId");

-- CreateIndex
CREATE INDEX "reviews_courseId_idx" ON "public"."reviews"("courseId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "public"."notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "public"."notifications"("createdAt");

-- CreateIndex
CREATE INDEX "certificates_userId_idx" ON "public"."certificates"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_userId_courseId_key" ON "public"."certificates"("userId", "courseId");

-- CreateIndex
CREATE INDEX "announcements_courseId_idx" ON "public"."announcements"("courseId");

-- CreateIndex
CREATE INDEX "exams_teacherId_idx" ON "public"."exams"("teacherId");

-- CreateIndex
CREATE INDEX "exams_courseId_idx" ON "public"."exams"("courseId");

-- CreateIndex
CREATE INDEX "exam_results_userId_idx" ON "public"."exam_results"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_results_examId_userId_key" ON "public"."exam_results"("examId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_settings_userId_key" ON "public"."payment_settings"("userId");

-- CreateIndex
CREATE INDEX "revenue_transactions_teacherId_idx" ON "public"."revenue_transactions"("teacherId");

-- CreateIndex
CREATE INDEX "revenue_transactions_userId_idx" ON "public"."revenue_transactions"("userId");

-- CreateIndex
CREATE INDEX "questions_examId_idx" ON "public"."questions"("examId");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "public"."transactions"("userId");

-- AddForeignKey
ALTER TABLE "lx"."purchases" ADD CONSTRAINT "purchases_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorites" ADD CONSTRAINT "favorites_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_results" ADD CONSTRAINT "exam_results_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
