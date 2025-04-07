/*
  Warnings:

  - You are about to alter the column `department_special_order` on the `department` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(65,0)`.
  - You are about to alter the column `after_Fiverr_bonus` on the `project` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(65,0)`.
  - You are about to alter the column `team_achieve` on the `team` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(65,0)`.

*/
-- AlterTable
ALTER TABLE "department" ALTER COLUMN "department_special_order" SET DATA TYPE DECIMAL(65,0);

-- AlterTable
ALTER TABLE "project" ALTER COLUMN "after_Fiverr_bonus" SET DATA TYPE DECIMAL(65,0);

-- AlterTable
ALTER TABLE "team" ALTER COLUMN "team_achieve" SET DATA TYPE DECIMAL(65,0);
