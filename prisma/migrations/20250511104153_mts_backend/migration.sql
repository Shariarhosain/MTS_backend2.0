-- CreateTable
CREATE TABLE "anouncement" (
    "id" SERIAL NOT NULL,
    "is_done" BOOLEAN DEFAULT false,

    CONSTRAINT "anouncement_pkey" PRIMARY KEY ("id")
);
