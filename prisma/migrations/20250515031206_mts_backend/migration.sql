-- CreateEnum
CREATE TYPE "branch" AS ENUM ('Jamuna_branch', 'Banasree_branch');

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "branch" "branch";

-- AlterTable
ALTER TABLE "team_member" ADD COLUMN     "branch" "branch";
