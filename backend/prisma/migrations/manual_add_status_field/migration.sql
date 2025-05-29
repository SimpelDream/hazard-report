-- 添加status字段，默认值为"进行中"
ALTER TABLE "reports" ADD COLUMN "status" TEXT DEFAULT '进行中';

-- 添加statusUpdatedAt字段
ALTER TABLE "reports" ADD COLUMN "statusUpdatedAt" TIMESTAMP;

-- CreateTable
CREATE TABLE "Report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "project" TEXT NOT NULL,
    "reporter" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "category" TEXT,
    "foundAt" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT NOT NULL
); 