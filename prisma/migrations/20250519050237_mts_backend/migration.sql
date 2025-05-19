/*
  Warnings:

  - A unique constraint covering the columns `[teamMemberId,date]` on the table `DailyAttendance` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DailyAttendance_teamMemberId_date_key" ON "DailyAttendance"("teamMemberId", "date");
