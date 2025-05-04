/*
  Warnings:

  - You are about to drop the column `total_assign_project` on the `department` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[project_name]` on the table `project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "department" DROP COLUMN "total_assign_project";

-- CreateTable
CREATE TABLE "task_assign_team" (
    "id" SERIAL NOT NULL,
    "task_assign_id" INTEGER NOT NULL,
    "department_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,

    CONSTRAINT "task_assign_team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_assign_team_task_assign_id_key" ON "task_assign_team"("task_assign_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_project_name_key" ON "project"("project_name");

-- AddForeignKey
ALTER TABLE "task_assign_team" ADD CONSTRAINT "task_assign_team_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assign_team" ADD CONSTRAINT "task_assign_team_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assign_team" ADD CONSTRAINT "task_assign_team_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
