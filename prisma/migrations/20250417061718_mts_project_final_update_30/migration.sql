/*
  Warnings:

  - You are about to drop the column `meeting_date` on the `revision` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "revision" DROP COLUMN "meeting_date",
ADD COLUMN     "metting_date" DATE;
