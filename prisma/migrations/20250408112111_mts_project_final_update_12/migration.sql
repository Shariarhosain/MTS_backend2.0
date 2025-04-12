-- DropForeignKey
ALTER TABLE "profile" DROP CONSTRAINT "profile_profile_person_name_id_fkey";

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_profile_person_name_id_fkey" FOREIGN KEY ("profile_person_name_id") REFERENCES "team_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
