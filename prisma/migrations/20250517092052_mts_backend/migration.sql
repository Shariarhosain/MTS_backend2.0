-- AlterTable
ALTER TABLE "TeamMemberTargetHistory" ALTER COLUMN "team_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TeamTargetHistory" ALTER COLUMN "team_member_id" DROP NOT NULL,
ALTER COLUMN "team_member_names" DROP NOT NULL;
