-- AlterTable
ALTER TABLE "team" ADD COLUMN     "team_target" DECIMAL(65,0);

-- CreateTable
CREATE TABLE "member_target" (
    "id" SERIAL NOT NULL,
    "team_member_id" INTEGER NOT NULL,
    "target" DECIMAL(65,0),
    "achieve" DECIMAL(65,0),
    "carry" DECIMAL(65,0),
    "cancel" DECIMAL(65,0),
    "update_at" DATE,

    CONSTRAINT "member_target_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "member_target" ADD CONSTRAINT "member_target_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
