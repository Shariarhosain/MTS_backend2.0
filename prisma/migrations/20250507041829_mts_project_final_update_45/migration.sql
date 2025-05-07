-- AlterTable
ALTER TABLE "project" ADD COLUMN     "update_at" DATE;

-- CreateTable
CREATE TABLE "today_task" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "client_name" TEXT,
    "expected_finish_time" TEXT,
    "team_id" INTEGER,

    CONSTRAINT "today_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_team_memberTotoday_task" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_team_memberTotoday_task_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_team_memberTotoday_task_B_index" ON "_team_memberTotoday_task"("B");

-- AddForeignKey
ALTER TABLE "today_task" ADD CONSTRAINT "today_task_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "today_task" ADD CONSTRAINT "today_task_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_team_memberTotoday_task" ADD CONSTRAINT "_team_memberTotoday_task_A_fkey" FOREIGN KEY ("A") REFERENCES "team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_team_memberTotoday_task" ADD CONSTRAINT "_team_memberTotoday_task_B_fkey" FOREIGN KEY ("B") REFERENCES "today_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
