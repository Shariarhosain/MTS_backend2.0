/*
  Warnings:

  - You are about to drop the `project` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "project" DROP CONSTRAINT "project_department_id_fkey";

-- DropForeignKey
ALTER TABLE "project" DROP CONSTRAINT "project_ordered_by_fkey";

-- DropForeignKey
ALTER TABLE "project" DROP CONSTRAINT "project_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "project" DROP CONSTRAINT "project_team_id_fkey";

-- DropTable
DROP TABLE "project";

-- CreateTable
CREATE TABLE "project_master" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT,
    "date" DATE,
    "project_name" VARCHAR(200),
    "ops_status" TEXT,
    "sales_comments" TEXT,
    "opsleader_comments" TEXT,
    "sheet_link" TEXT,
    "Assigned_date" DATE,
    "ordered_by" INTEGER NOT NULL,
    "deli_last_date" DATE,
    "status" TEXT,
    "order_amount" DECIMAL(65,0),
    "after_fiverr_amount" DECIMAL(65,30),
    "bonus" DECIMAL(65,0),
    "after_Fiverr_bonus" DECIMAL(65,0),
    "rating" INTEGER,
    "department_id" INTEGER NOT NULL,
    "project_requirements" TEXT,
    "profile_id" INTEGER,
    "team_id" INTEGER,

    CONSTRAINT "project_master_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_master_project_name_key" ON "project_master"("project_name");

-- AddForeignKey
ALTER TABLE "project_master" ADD CONSTRAINT "project_master_ordered_by_fkey" FOREIGN KEY ("ordered_by") REFERENCES "team_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_master" ADD CONSTRAINT "project_master_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_master" ADD CONSTRAINT "project_master_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_master" ADD CONSTRAINT "project_master_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
