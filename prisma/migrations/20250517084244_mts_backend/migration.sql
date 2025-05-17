-- CreateTable
CREATE TABLE "TeamTargetHistory" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "team_name" TEXT NOT NULL,
    "team_target" DECIMAL(65,0) NOT NULL,
    "team_member_id" INTEGER NOT NULL,
    "team_member_names" TEXT NOT NULL,
    "total_achived" DECIMAL(65,0) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamTargetHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMemberTargetHistory" (
    "id" SERIAL NOT NULL,
    "team_member_id" INTEGER NOT NULL,
    "target_amount" DECIMAL(65,0) NOT NULL,
    "team_member_name" TEXT NOT NULL,
    "total_achived" DECIMAL(65,0) NOT NULL,
    "team_id" INTEGER NOT NULL,
    "team_name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMemberTargetHistory_pkey" PRIMARY KEY ("id")
);
