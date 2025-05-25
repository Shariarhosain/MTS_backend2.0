-- DropForeignKey
ALTER TABLE "project" DROP CONSTRAINT "project_ordered_by_fkey";

-- AlterTable
ALTER TABLE "project" ALTER COLUMN "ordered_by" DROP NOT NULL,
ALTER COLUMN "department_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_ordered_by_fkey" FOREIGN KEY ("ordered_by") REFERENCES "team_member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
