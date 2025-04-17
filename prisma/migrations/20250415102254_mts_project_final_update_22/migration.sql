/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `team_member` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "team_member" ADD COLUMN     "uid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "team_member_uid_key" ON "team_member"("uid");
