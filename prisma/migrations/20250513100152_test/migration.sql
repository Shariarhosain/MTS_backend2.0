/*
  Warnings:

  - You are about to drop the column `department_achieve` on the `department` table. All the data in the column will be lost.
  - You are about to drop the column `department_cancel` on the `department` table. All the data in the column will be lost.
  - You are about to drop the column `department_designation` on the `department` table. All the data in the column will be lost.
  - You are about to drop the column `department_special_order` on the `department` table. All the data in the column will be lost.
  - You are about to drop the column `project_requirements` on the `department` table. All the data in the column will be lost.
  - You are about to drop the column `total_carry` on the `department` table. All the data in the column will be lost.
  - You are about to drop the column `team_achieve` on the `team` table. All the data in the column will be lost.
  - You are about to drop the column `team_cancel` on the `team` table. All the data in the column will be lost.
  - You are about to drop the column `total_carry` on the `team` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "department" DROP COLUMN "department_achieve",
DROP COLUMN "department_cancel",
DROP COLUMN "department_designation",
DROP COLUMN "department_special_order",
DROP COLUMN "project_requirements",
DROP COLUMN "total_carry";

-- AlterTable
ALTER TABLE "team" DROP COLUMN "team_achieve",
DROP COLUMN "team_cancel",
DROP COLUMN "total_carry";
