/*
  Warnings:

  - You are about to drop the column `cpanel_email` on the `project` table. All the data in the column will be lost.
  - You are about to drop the column `order_pag_link` on the `project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "project" DROP COLUMN "cpanel_email",
DROP COLUMN "order_pag_link",
ADD COLUMN     "order_page_link" TEXT;
