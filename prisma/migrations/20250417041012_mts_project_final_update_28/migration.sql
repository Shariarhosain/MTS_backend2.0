-- CreateTable
CREATE TABLE "revision" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "revision_date" DATE,
    "revision_comments" TEXT,
    "delivery_date" DATE,
    "task_assign_id" INTEGER,

    CONSTRAINT "revision_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "revision" ADD CONSTRAINT "revision_task_assign_id_fkey" FOREIGN KEY ("task_assign_id") REFERENCES "task_assign_team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
