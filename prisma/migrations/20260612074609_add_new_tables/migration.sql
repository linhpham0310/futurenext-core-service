/*
  Warnings:

  - Added the required column `courseId` to the `lessons` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "course_mgmt"."lessons" ADD COLUMN     "courseId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "course_mgmt"."lessons" ADD CONSTRAINT "lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course_mgmt"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
