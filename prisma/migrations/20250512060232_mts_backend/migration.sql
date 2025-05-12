/*
  Warnings:

  - You are about to drop the column `keywords` on the `profile` table. All the data in the column will be lost.
  - You are about to drop the column `promotion_amount` on the `profile` table. All the data in the column will be lost.
  - You are about to drop the column `ranking_page` on the `profile` table. All the data in the column will be lost.
  - You are about to drop the column `row` on the `profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "profile" DROP COLUMN "keywords",
DROP COLUMN "promotion_amount",
DROP COLUMN "ranking_page",
DROP COLUMN "row";

-- CreateTable
CREATE TABLE "profile_ranking" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "keywords" TEXT,
    "row" INTEGER,
    "ranking_page" TEXT,

    CONSTRAINT "profile_ranking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_promotion" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "promotion_amount" DECIMAL(65,0),
    "created_date" TIMESTAMP(3),
    "update_at" TIMESTAMP(3),

    CONSTRAINT "profile_promotion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "profile_ranking" ADD CONSTRAINT "profile_ranking_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_promotion" ADD CONSTRAINT "profile_promotion_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
