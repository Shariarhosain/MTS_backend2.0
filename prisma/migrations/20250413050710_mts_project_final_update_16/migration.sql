/*
  Warnings:

  - You are about to drop the column `profile_person_name_id` on the `profile` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "profile" DROP CONSTRAINT "profile_profile_person_name_id_fkey";

-- AlterTable
ALTER TABLE "profile" DROP COLUMN "profile_person_name_id";

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "profile_id" INTEGER;

-- CreateTable
CREATE TABLE "_profileToteam_member" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_profileToteam_member_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_profileToteam_member_B_index" ON "_profileToteam_member"("B");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_profileToteam_member" ADD CONSTRAINT "_profileToteam_member_A_fkey" FOREIGN KEY ("A") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_profileToteam_member" ADD CONSTRAINT "_profileToteam_member_B_fkey" FOREIGN KEY ("B") REFERENCES "team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
