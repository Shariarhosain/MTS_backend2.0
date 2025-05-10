/*
  Warnings:

  - You are about to drop the column `achieve` on the `member_target` table. All the data in the column will be lost.
  - You are about to drop the column `cancel` on the `member_target` table. All the data in the column will be lost.
  - You are about to drop the column `carry` on the `member_target` table. All the data in the column will be lost.
  - You are about to drop the column `update_at` on the `member_target` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "member_target" DROP COLUMN "achieve",
DROP COLUMN "cancel",
DROP COLUMN "carry",
DROP COLUMN "update_at";

-- CreateTable
CREATE TABLE "_member_targetTotoday_task" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_member_targetTotoday_task_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_member_targetTotoday_task_B_index" ON "_member_targetTotoday_task"("B");

-- AddForeignKey
ALTER TABLE "_member_targetTotoday_task" ADD CONSTRAINT "_member_targetTotoday_task_A_fkey" FOREIGN KEY ("A") REFERENCES "member_target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_member_targetTotoday_task" ADD CONSTRAINT "_member_targetTotoday_task_B_fkey" FOREIGN KEY ("B") REFERENCES "today_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
