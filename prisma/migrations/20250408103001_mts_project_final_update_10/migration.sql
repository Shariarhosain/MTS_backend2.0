/*
  Warnings:

  - You are about to drop the `_departmentToproject` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `department_id` to the `project` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_departmentToproject" DROP CONSTRAINT "_departmentToproject_A_fkey";

-- DropForeignKey
ALTER TABLE "_departmentToproject" DROP CONSTRAINT "_departmentToproject_B_fkey";

-- DropForeignKey
ALTER TABLE "profile" DROP CONSTRAINT "profile_profile_person_name_id_fkey";

-- DropForeignKey
ALTER TABLE "task_assign_team" DROP CONSTRAINT "task_assign_team_department_id_fkey";

-- DropForeignKey
ALTER TABLE "task_assign_team" DROP CONSTRAINT "task_assign_team_project_id_fkey";

-- DropForeignKey
ALTER TABLE "task_assign_team" DROP CONSTRAINT "task_assign_team_team_id_fkey";

-- DropForeignKey
ALTER TABLE "team" DROP CONSTRAINT "team_department_id_fkey";

-- DropForeignKey
ALTER TABLE "team_member" DROP CONSTRAINT "team_member_team_id_fkey";

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "department_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "_departmentToproject";

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_profile_person_name_id_fkey" FOREIGN KEY ("profile_person_name_id") REFERENCES "team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assign_team" ADD CONSTRAINT "task_assign_team_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assign_team" ADD CONSTRAINT "task_assign_team_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assign_team" ADD CONSTRAINT "task_assign_team_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
