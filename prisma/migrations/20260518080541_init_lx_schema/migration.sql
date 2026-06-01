-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "lx";

-- CreateEnum
CREATE TYPE "lx"."ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "lx"."lx_learning_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
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
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "interaction_type" VARCHAR(20) NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "context_snapshot" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lx_ai_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lx"."lx_lesson_contexts" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content_chunk" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lx_lesson_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lx"."lx_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lx_purchases_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "lx_purchases_userId_courseId_key" ON "lx"."lx_purchases"("userId", "courseId");
