/*
  Warnings:

  - A unique constraint covering the columns `[profile_name]` on the table `profile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "profile_profile_name_key" ON "profile"("profile_name");
