/*
  Warnings:

  - You are about to drop the column `task_assign_id` on the `revision` table. All the data in the column will be lost.
  - You are about to drop the `_projectTotask_assign_team` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `task_assign_team` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_projectTotask_assign_team" DROP CONSTRAINT "_projectTotask_assign_team_A_fkey";

-- DropForeignKey
ALTER TABLE "_projectTotask_assign_team" DROP CONSTRAINT "_projectTotask_assign_team_B_fkey";

-- DropForeignKey
ALTER TABLE "revision" DROP CONSTRAINT "revision_task_assign_id_fkey";

-- DropForeignKey
ALTER TABLE "task_assign_team" DROP CONSTRAINT "task_assign_team_department_id_fkey";

-- DropForeignKey
ALTER TABLE "task_assign_team" DROP CONSTRAINT "task_assign_team_team_id_fkey";

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "team_id" INTEGER;

-- AlterTable
ALTER TABLE "revision" DROP COLUMN "task_assign_id";

-- DropTable
DROP TABLE "_projectTotask_assign_team";

-- DropTable
DROP TABLE "task_assign_team";

-- CreateTable
CREATE TABLE "_revisionToteam" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_revisionToteam_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_revisionToteam_B_index" ON "_revisionToteam"("B");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_revisionToteam" ADD CONSTRAINT "_revisionToteam_A_fkey" FOREIGN KEY ("A") REFERENCES "revision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_revisionToteam" ADD CONSTRAINT "_revisionToteam_B_fkey" FOREIGN KEY ("B") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
