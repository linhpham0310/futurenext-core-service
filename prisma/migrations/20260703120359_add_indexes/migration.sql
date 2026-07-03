-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "course_mgmt";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "lx";

-- CreateEnum
CREATE TYPE "course_mgmt"."CourseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "course_mgmt"."LessonType" AS ENUM ('VIDEO', 'ARTICLE', 'QUIZ', 'LAB');

-- CreateEnum
CREATE TYPE "lx"."ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

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

-- CreateTable
CREATE TABLE "course_mgmt"."courses" (
    "id" UUID NOT NULL,
    "instructorId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" VARCHAR(500),
    "thumbnailUrl" TEXT,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "status" "course_mgmt"."CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "outcomes" JSONB,
    "aiMetadata" JSONB,
    "language" TEXT NOT NULL DEFAULT 'vi',
    "level" TEXT NOT NULL DEFAULT 'beginner',
    "categoryId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_mgmt"."sections" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_mgmt"."lessons" (
    "id" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "course_mgmt"."LessonType" NOT NULL DEFAULT 'ARTICLE',
    "content" TEXT,
    "duration" INTEGER DEFAULT 0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isFreePreview" BOOLEAN NOT NULL DEFAULT false,
    "aiMetadata" JSONB NOT NULL DEFAULT '[]',
    "mainTopics" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_mgmt"."learning_outcomes" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_mgmt"."curriculum_mappings" (
    "id" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "outcomeId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_mgmt"."course_review_logs" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "action" "course_mgmt"."CourseStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_review_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lx"."lx_learning_progress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "status" "lx"."ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "lastPosition" INTEGER NOT NULL DEFAULT 0,
    "score" DECIMAL(5,2),
    "metadata" JSONB DEFAULT '{}',
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lx_learning_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lx"."lx_ai_interactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "interaction_type" VARCHAR(20) NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "context_snapshot" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lx_ai_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lx"."lx_lesson_contexts" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content_chunk" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lx_lesson_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchases" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT DEFAULT 'UNKNOWN',
    "paymentId" TEXT,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."favorites" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."certificates" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "studentName" VARCHAR(255) NOT NULL,
    "studentEmail" VARCHAR(255) NOT NULL,
    "courseTitle" VARCHAR(255) NOT NULL,
    "certificateUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" UUID,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."announcement_broadcasts" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'IN_APP',
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "targetUserIds" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdBy" UUID NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcement_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."announcements" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exams" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
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
CREATE TABLE "public"."exam_questions" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "type" "public"."QuestionType" NOT NULL DEFAULT 'MCQ',
    "options" JSONB,
    "correctAnswer" TEXT,
    "explanation" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exam_results" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "score" DECIMAL(5,2),
    "totalQuestions" INTEGER NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "status" "public"."ExamResultStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_settings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bankName" VARCHAR(100),
    "bankAccount" VARCHAR(50),
    "accountHolder" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."revenue_transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "public"."TransactionType" NOT NULL DEFAULT 'PURCHASE',
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemSetting" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CartItem" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Question" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "course_mgmt"."courses"("slug");

-- CreateIndex
CREATE INDEX "courses_instructorId_idx" ON "course_mgmt"."courses"("instructorId");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "course_mgmt"."courses"("status");

-- CreateIndex
CREATE INDEX "sections_courseId_idx" ON "course_mgmt"."sections"("courseId");

-- CreateIndex
CREATE INDEX "lessons_sectionId_idx" ON "course_mgmt"."lessons"("sectionId");

-- CreateIndex
CREATE INDEX "lessons_courseId_idx" ON "course_mgmt"."lessons"("courseId");

-- CreateIndex
CREATE INDEX "learning_outcomes_courseId_idx" ON "course_mgmt"."learning_outcomes"("courseId");

-- CreateIndex
CREATE INDEX "curriculum_mappings_sectionId_idx" ON "course_mgmt"."curriculum_mappings"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_mappings_sectionId_outcomeId_key" ON "course_mgmt"."curriculum_mappings"("sectionId", "outcomeId");

-- CreateIndex
CREATE INDEX "lx_learning_progress_userId_courseId_idx" ON "lx"."lx_learning_progress"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "lx_learning_progress_userId_lessonId_key" ON "lx"."lx_learning_progress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "lx_ai_interactions_user_id_lesson_id_idx" ON "lx"."lx_ai_interactions"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "lx_lesson_contexts_lesson_id_idx" ON "lx"."lx_lesson_contexts"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "lx_lesson_contexts_lesson_id_chunk_index_key" ON "lx"."lx_lesson_contexts"("lesson_id", "chunk_index");

-- CreateIndex
CREATE INDEX "purchases_userId_idx" ON "public"."purchases"("userId");

-- CreateIndex
CREATE INDEX "purchases_courseId_idx" ON "public"."purchases"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_userId_courseId_key" ON "public"."purchases"("userId", "courseId");

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
CREATE INDEX "exam_questions_examId_idx" ON "public"."exam_questions"("examId");

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
CREATE INDEX "transactions_userId_idx" ON "public"."transactions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "public"."Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "public"."SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_courseId_key" ON "public"."CartItem"("userId", "courseId");

-- CreateIndex
CREATE INDEX "Question_userId_idx" ON "public"."Question"("userId");

-- CreateIndex
CREATE INDEX "Question_courseId_idx" ON "public"."Question"("courseId");

-- AddForeignKey
ALTER TABLE "course_mgmt"."courses" ADD CONSTRAINT "courses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_mgmt"."sections" ADD CONSTRAINT "sections_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_mgmt"."lessons" ADD CONSTRAINT "lessons_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "course_mgmt"."sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_mgmt"."learning_outcomes" ADD CONSTRAINT "learning_outcomes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_mgmt"."curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "course_mgmt"."sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_mgmt"."curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "course_mgmt"."learning_outcomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_mgmt"."course_review_logs" ADD CONSTRAINT "course_review_logs_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorites" ADD CONSTRAINT "favorites_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exams" ADD CONSTRAINT "exams_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_questions" ADD CONSTRAINT "exam_questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_results" ADD CONSTRAINT "exam_results_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
