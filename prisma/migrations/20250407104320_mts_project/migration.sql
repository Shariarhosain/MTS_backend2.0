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
    "order_by_id" INTEGER NOT NULL,
    "deli_last_date" TIMESTAMP(3),
    "status" TEXT,
    "order_amount" DECIMAL(65,0),
    "after_fiverr_amount" DECIMAL(65,30),
    "bonus" DECIMAL(65,0),
    "after_Fiverr_bonus" DECIMAL(65,30),
    "assign_tm_id" INTEGER NOT NULL,
    "rating" INTEGER,
    "department" TEXT,
    "project_requirements" TEXT,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team" (
    "id" SERIAL NOT NULL,
    "team_name" TEXT,
    "department_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "team_achieve" DECIMAL(65,30),
    "team_cancel" INTEGER,
    "total_carry" DECIMAL(65,0),

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department" (
    "id" SERIAL NOT NULL,
    "department_name" TEXT,
    "department_target" DECIMAL(65,0),
    "department_achieve" DECIMAL(65,0),
    "department_cancel" DECIMAL(65,0),
    "department_special_order" DECIMAL(65,30),
    "department_designation" TEXT,
    "project_requirements" TEXT,
    "total_assign_project" INTEGER,
    "total_carry" DECIMAL(65,0),

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
    "special_order" DECIMAL(65,0),
    "special_order_count" INTEGER,
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
    "email" TEXT,
    "number" VARCHAR(11),
    "permanent_address" TEXT,
    "present_address" TEXT,
    "gender" TEXT,
    "blood_group" TEXT,
    "relationship" TEXT,
    "guardian_relation" TEXT,
    "guardian_number" TEXT,
    "guardian_address" TEXT,
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

-- CreateTable
CREATE TABLE "_teamToteam_member" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_teamToteam_member_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_member_id_key" ON "team"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_profile_person_name_id_key" ON "profile"("profile_person_name_id");

-- CreateIndex
CREATE INDEX "_teamToteam_member_B_index" ON "_teamToteam_member"("B");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_order_by_id_fkey" FOREIGN KEY ("order_by_id") REFERENCES "team_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_assign_tm_id_fkey" FOREIGN KEY ("assign_tm_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_profile_person_name_id_fkey" FOREIGN KEY ("profile_person_name_id") REFERENCES "team_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_teamToteam_member" ADD CONSTRAINT "_teamToteam_member_A_fkey" FOREIGN KEY ("A") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_teamToteam_member" ADD CONSTRAINT "_teamToteam_member_B_fkey" FOREIGN KEY ("B") REFERENCES "team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
