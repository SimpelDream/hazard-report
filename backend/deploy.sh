#!/bin/bash

# 设置日志文件
LOGFILE=deploy.log

echo "===== 部署开始 $(date) =====" >> $LOGFILE

# 安装依赖
echo "[+] 安装依赖..." >> $LOGFILE
npm install >> $LOGFILE 2>&1

# 创建必要的目录
echo "[+] 创建目录..." >> $LOGFILE
mkdir -p uploads logs orders
chmod 755 uploads logs orders

# 编译 TypeScript
echo "[+] 编译 TypeScript..." >> $LOGFILE
npm run build >> $LOGFILE 2>&1

# 生成 Prisma 客户端
echo "[+] 生成 Prisma 客户端..." >> $LOGFILE
npx prisma generate >> $LOGFILE 2>&1

# 执行数据库迁移
echo "[+] 执行数据库迁移..." >> $LOGFILE
npx prisma migrate deploy >> $LOGFILE 2>&1

# 重启服务
echo "[+] 重启服务..." >> $LOGFILE
pm2 restart hazard-report-api >> $LOGFILE 2>&1 || pm2 start ecosystem.config.js >> $LOGFILE 2>&1

echo "===== 部署完成 $(date) =====" >> $LOGFILE 