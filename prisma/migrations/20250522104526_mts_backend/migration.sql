-- CreateTable
CREATE TABLE "othercost" (
    "id" SERIAL NOT NULL,
    "date" DATE,
    "details" TEXT,
    "cost_amount" DECIMAL(65,0),
    "created_date" TIMESTAMP(3),
    "update_at" TIMESTAMP(3),

    CONSTRAINT "othercost_pkey" PRIMARY KEY ("id")
);
