/*
  Warnings:

  - You are about to drop the `_member_targetTotoday_task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `member_target` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_member_targetTotoday_task" DROP CONSTRAINT "_member_targetTotoday_task_A_fkey";

-- DropForeignKey
ALTER TABLE "_member_targetTotoday_task" DROP CONSTRAINT "_member_targetTotoday_task_B_fkey";

-- DropForeignKey
ALTER TABLE "member_target" DROP CONSTRAINT "member_target_team_member_id_fkey";

-- DropTable
DROP TABLE "_member_targetTotoday_task";

-- DropTable
DROP TABLE "member_target";

-- CreateTable
CREATE TABLE "member_distribution" (
    "id" SERIAL NOT NULL,
    "team_member_id" INTEGER NOT NULL,
    "amount" DECIMAL(65,0),

    CONSTRAINT "member_distribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_member_distributionTotoday_task" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_member_distributionTotoday_task_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_member_distributionTotoday_task_B_index" ON "_member_distributionTotoday_task"("B");

-- AddForeignKey
ALTER TABLE "member_distribution" ADD CONSTRAINT "member_distribution_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_member_distributionTotoday_task" ADD CONSTRAINT "_member_distributionTotoday_task_A_fkey" FOREIGN KEY ("A") REFERENCES "member_distribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_member_distributionTotoday_task" ADD CONSTRAINT "_member_distributionTotoday_task_B_fkey" FOREIGN KEY ("B") REFERENCES "today_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
