/*
  Warnings:

  - You are about to drop the `_projectToteam` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_projectToteam" DROP CONSTRAINT "_projectToteam_A_fkey";

-- DropForeignKey
ALTER TABLE "_projectToteam" DROP CONSTRAINT "_projectToteam_B_fkey";

-- DropTable
DROP TABLE "_projectToteam";
