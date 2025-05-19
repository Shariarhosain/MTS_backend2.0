/*
  Warnings:

  - A unique constraint covering the columns `[emp_code]` on the table `team_member` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "team_member" ADD COLUMN     "emp_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "team_member_emp_code_key" ON "team_member"("emp_code");
