-- AlterTable
ALTER TABLE "team" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "department_id" DROP NOT NULL;
