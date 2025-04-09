/*
  Warnings:

  - You are about to drop the column `department_id` on the `team_member` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "team_member" DROP CONSTRAINT "team_member_department_id_fkey";

-- AlterTable
ALTER TABLE "team_member" DROP COLUMN "department_id";
