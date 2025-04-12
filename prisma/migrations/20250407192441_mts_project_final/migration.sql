-- CreateTable
CREATE TABLE "project" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT,
    "date" TIMESTAMP(3),
    "project_name" VARCHAR(200),
    "ops_status" TEXT,
    "sales_comments" TEXT,
    "opsleader_comments" TEXT,
    "sheet_link" TEXT,
    "ordered_by" INTEGER NOT NULL,
    "deli_last_date" TIMESTAMP(3),
    "status" TEXT,
    "order_amount" DECIMAL(65,0),
    "after_fiverr_amount" DECIMAL(65,30),
    "bonus" DECIMAL(65,0),
    "after_Fiverr_bonus" DECIMAL(65,0),
    "assign_tm" INTEGER NOT NULL,
    "rating" INTEGER,
    "department_id" INTEGER NOT NULL,
    "project_requirements" TEXT,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team" (
    "id" SERIAL NOT NULL,
    "team_name" VARCHAR(250),
    "department_id" INTEGER NOT NULL,
    "team_achieve" DECIMAL(65,0),
    "team_cancel" INTEGER,
    "total_carry" DECIMAL(65,0),

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department" (
    "id" SERIAL NOT NULL,
    "department_name" VARCHAR(200),
    "department_target" DECIMAL(65,0),
    "department_achieve" DECIMAL(65,0),
    "department_cancel" DECIMAL(65,0),
    "department_special_order" DECIMAL(65,0),
    "department_designation" TEXT,
    "project_requirements" TEXT,
    "total_carry" DECIMAL(65,0),
    "total_assign_project" INTEGER,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile" (
    "id" SERIAL NOT NULL,
    "created_date" TIMESTAMP(3),
    "profile_name" TEXT,
    "profile_person_name_id" INTEGER NOT NULL,
    "order_amount" DECIMAL(65,0),
    "bonus_amount" DECIMAL(65,0),
    "order_count" INTEGER,
    "rank" DECIMAL(65,0),
    "cancel_count" INTEGER,
    "complete_count" INTEGER,
    "no_rating" INTEGER,
    "profile_target" DECIMAL(65,0),
    "department_id" INTEGER NOT NULL,
    "repeat_order" DECIMAL(65,0),
    "keywords" TEXT,
    "total_rating" DECIMAL(65,0),

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" VARCHAR(200),
    "number" VARCHAR(50),
    "permanent_address" TEXT,
    "present_address" TEXT,
    "gender" TEXT,
    "blood_group" TEXT,
    "relationship" TEXT,
    "guardian_relation" TEXT,
    "guardian_number" TEXT,
    "guardian_address" TEXT,
    "team_id" INTEGER,
    "department_id" INTEGER NOT NULL,
    "religion" TEXT,
    "education" TEXT,
    "dp" TEXT,
    "designation" TEXT,
    "role" TEXT,
    "target" DECIMAL(65,0),
    "rewards" TEXT,
    "rating" INTEGER,

    CONSTRAINT "team_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_team_name_key" ON "team"("team_name");

-- CreateIndex
CREATE UNIQUE INDEX "department_department_name_key" ON "department"("department_name");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_email_key" ON "team_member"("email");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_ordered_by_fkey" FOREIGN KEY ("ordered_by") REFERENCES "team_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_assign_tm_fkey" FOREIGN KEY ("assign_tm") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_profile_person_name_id_fkey" FOREIGN KEY ("profile_person_name_id") REFERENCES "team_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
