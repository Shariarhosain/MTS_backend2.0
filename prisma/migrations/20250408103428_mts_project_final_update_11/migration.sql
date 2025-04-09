-- DropForeignKey
ALTER TABLE "task_assign_team" DROP CONSTRAINT "task_assign_team_project_id_fkey";

-- CreateTable
CREATE TABLE "_projectTotask_assign_team" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_projectTotask_assign_team_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_projectTotask_assign_team_B_index" ON "_projectTotask_assign_team"("B");

-- AddForeignKey
ALTER TABLE "_projectTotask_assign_team" ADD CONSTRAINT "_projectTotask_assign_team_A_fkey" FOREIGN KEY ("A") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_projectTotask_assign_team" ADD CONSTRAINT "_projectTotask_assign_team_B_fkey" FOREIGN KEY ("B") REFERENCES "task_assign_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
