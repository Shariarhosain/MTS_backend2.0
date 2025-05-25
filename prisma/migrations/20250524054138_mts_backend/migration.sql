/*
  Warnings:

  - Added the required column `total_achived` to the `TeamMemberTargetHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TeamMemberTargetHistory" ADD COLUMN     "total_achived" DECIMAL(65,0) NOT NULL;
