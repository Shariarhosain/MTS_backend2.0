/*
  Warnings:

  - The `rewards` column on the `team_member` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "team_member" DROP CONSTRAINT "team_member_department_id_fkey";

-- AlterTable
ALTER TABLE "team_member" ALTER COLUMN "department_id" DROP NOT NULL,
DROP COLUMN "rewards",
ADD COLUMN     "rewards" DECIMAL(65,0);

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
