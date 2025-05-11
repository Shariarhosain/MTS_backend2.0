/*
  Warnings:

  - You are about to drop the `_member_distributionTotoday_task` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `project_id` to the `member_distribution` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_member_distributionTotoday_task" DROP CONSTRAINT "_member_distributionTotoday_task_A_fkey";

-- DropForeignKey
ALTER TABLE "_member_distributionTotoday_task" DROP CONSTRAINT "_member_distributionTotoday_task_B_fkey";

-- AlterTable
ALTER TABLE "member_distribution" ADD COLUMN     "project_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "_member_distributionTotoday_task";

-- AddForeignKey
ALTER TABLE "member_distribution" ADD CONSTRAINT "member_distribution_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
