-- DropForeignKey
ALTER TABLE "Project_special_order" DROP CONSTRAINT "Project_special_order_profile_id_fkey";

-- AlterTable
ALTER TABLE "Project_special_order" ADD COLUMN     "delivery_status_date" TIMESTAMP(3),
ADD COLUMN     "status" TEXT,
ALTER COLUMN "profile_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Project_special_order" ADD CONSTRAINT "Project_special_order_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
