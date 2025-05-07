/*
  Warnings:

  - You are about to drop the `_team_memberTotoday_task` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_team_memberTotoday_task" DROP CONSTRAINT "_team_memberTotoday_task_A_fkey";

-- DropForeignKey
ALTER TABLE "_team_memberTotoday_task" DROP CONSTRAINT "_team_memberTotoday_task_B_fkey";

-- AlterTable
ALTER TABLE "today_task" ADD COLUMN     "ops_status" TEXT,
ADD COLUMN     "team_member_id" INTEGER;

-- DropTable
DROP TABLE "_team_memberTotoday_task";

-- CreateTable
CREATE TABLE "_ProjectAssignments" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProjectAssignments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProjectAssignments_B_index" ON "_ProjectAssignments"("B");

-- AddForeignKey
ALTER TABLE "today_task" ADD CONSTRAINT "today_task_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectAssignments" ADD CONSTRAINT "_ProjectAssignments_A_fkey" FOREIGN KEY ("A") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectAssignments" ADD CONSTRAINT "_ProjectAssignments_B_fkey" FOREIGN KEY ("B") REFERENCES "team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
