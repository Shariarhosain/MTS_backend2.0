-- AlterTable
ALTER TABLE "project" ADD COLUMN     "extension" INTEGER,
ADD COLUMN     "is_delivered" BOOLEAN DEFAULT false,
ADD COLUMN     "revision" INTEGER;
