/*
  Warnings:

  - You are about to drop the column `assign_tm` on the `project` table. All the data in the column will be lost.
  - You are about to drop the column `department_id` on the `project` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "profile" DROP CONSTRAINT "profile_department_id_fkey";

-- DropForeignKey
ALTER TABLE "project" DROP CONSTRAINT "project_assign_tm_fkey";

-- DropForeignKey
ALTER TABLE "project" DROP CONSTRAINT "project_department_id_fkey";

-- AlterTable
ALTER TABLE "project" DROP COLUMN "assign_tm",
DROP COLUMN "department_id";

-- CreateTable
CREATE TABLE "_projectToteam" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_projectToteam_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_departmentToprofile" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_departmentToprofile_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_departmentToproject" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_departmentToproject_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_projectToteam_B_index" ON "_projectToteam"("B");

-- CreateIndex
CREATE INDEX "_departmentToprofile_B_index" ON "_departmentToprofile"("B");

-- CreateIndex
CREATE INDEX "_departmentToproject_B_index" ON "_departmentToproject"("B");

-- AddForeignKey
ALTER TABLE "_projectToteam" ADD CONSTRAINT "_projectToteam_A_fkey" FOREIGN KEY ("A") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_projectToteam" ADD CONSTRAINT "_projectToteam_B_fkey" FOREIGN KEY ("B") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_departmentToprofile" ADD CONSTRAINT "_departmentToprofile_A_fkey" FOREIGN KEY ("A") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_departmentToprofile" ADD CONSTRAINT "_departmentToprofile_B_fkey" FOREIGN KEY ("B") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_departmentToproject" ADD CONSTRAINT "_departmentToproject_A_fkey" FOREIGN KEY ("A") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_departmentToproject" ADD CONSTRAINT "_departmentToproject_B_fkey" FOREIGN KEY ("B") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
