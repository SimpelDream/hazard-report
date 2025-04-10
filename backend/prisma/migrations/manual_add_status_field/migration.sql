-- 添加status字段，默认值为"进行中"
ALTER TABLE "reports" ADD COLUMN "status" TEXT DEFAULT '进行中';

-- 添加statusUpdatedAt字段
ALTER TABLE "reports" ADD COLUMN "statusUpdatedAt" TIMESTAMP; 