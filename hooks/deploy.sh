#!/bin/bash

LOGFILE=/var/www/hazard-report/hooks/deploy.log

echo "===== 自动部署开始 $(date) =====" >> $LOGFILE

# 进入项目根目录并拉取最新代码
cd /var/www/hazard-report || {
  echo " 找不到项目目录" >> $LOGFILE
  exit 1
}
git pull origin main >> $LOGFILE 2>&1

# 安装前后端依赖
cd backend || {
  echo " backend 目录不存在" >> $LOGFILE
  exit 1
}
echo "[+] 安装 npm 依赖..." >> $LOGFILE
npm install >> $LOGFILE 2>&1

# 确保 Prisma 客户端生成
echo "[+] 执行 Prisma generate..." >> $LOGFILE
npx prisma generate >> $LOGFILE 2>&1

# 执行数据库迁移（非强制）
echo "[+] 数据库结构迁移检查..." >> $LOGFILE
npx prisma migrate deploy >> $LOGFILE 2>&1

# 重启后端服务
echo "[+] 重启 PM2 服务..." >> $LOGFILE
pm2 restart hazard-report-api >> $LOGFILE 2>&1 || echo " PM2 未找到服务名 hazard-report-api" >> $LOGFILE

echo "===== 部署完成 $(date) =====" >> $LOGFILE

