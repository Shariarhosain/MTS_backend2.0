-- CreateTable
CREATE TABLE "Project_special_order" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "special_order_amount" DECIMAL(65,0),
    "delivery_date" DATE,
    "client_name" TEXT,
    "created_date" TIMESTAMP(3),
    "update_at" TIMESTAMP(3),

    CONSTRAINT "Project_special_order_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Project_special_order" ADD CONSTRAINT "Project_special_order_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
