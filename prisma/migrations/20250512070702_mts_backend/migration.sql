-- AlterTable
ALTER TABLE "team_member" ADD COLUMN     "department_id" INTEGER;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
