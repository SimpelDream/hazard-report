-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "project" TEXT NOT NULL,
    "reporter" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "category" TEXT,
    "foundAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
