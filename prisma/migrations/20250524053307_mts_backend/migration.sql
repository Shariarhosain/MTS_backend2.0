/*
  Warnings:

  - You are about to drop the column `total_achived` on the `TeamMemberTargetHistory` table. All the data in the column will be lost.
  - You are about to drop the `TeamTargetHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "TeamMemberTargetHistory" DROP COLUMN "total_achived",
ALTER COLUMN "start_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "end_date" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "TeamTargetHistory";

-- AddForeignKey
ALTER TABLE "TeamMemberTargetHistory" ADD CONSTRAINT "TeamMemberTargetHistory_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberTargetHistory" ADD CONSTRAINT "TeamMemberTargetHistory_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
