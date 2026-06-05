-- CreateExtension
--CREATE EXTENSION IF NOT EXISTS vector;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "course_mgmt";

-- CreateEnum
CREATE TYPE "course_mgmt"."CourseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "course_mgmt"."LessonType" AS ENUM ('VIDEO', 'ARTICLE', 'QUIZ');

-- CreateTable
CREATE TABLE "course_mgmt"."courses" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "status" "course_mgmt"."CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "outcomes" JSONB,
    "aiMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_mgmt"."sections" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_mgmt"."lessons" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "course_mgmt"."LessonType" NOT NULL DEFAULT 'VIDEO',
    "content" TEXT,
    "duration" INTEGER DEFAULT 0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isFreePreview" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_mgmt"."curriculum_mappings" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "keyConcept" TEXT NOT NULL,
    "taxonomyLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "curriculum_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_mgmt"."course_review_logs" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" "course_mgmt"."CourseStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_review_logs_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "curriculum_mappings_courseId_idx" ON "course_mgmt"."curriculum_mappings"("courseId");

-- AddForeignKey
ALTER TABLE "course_mgmt"."sections" ADD CONSTRAINT "sections_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_mgmt"."lessons" ADD CONSTRAINT "lessons_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "course_mgmt"."sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_mgmt"."curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_mgmt"."course_review_logs" ADD CONSTRAINT "course_review_logs_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
