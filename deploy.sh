#!/bin/bash

# 设置错误时退出
set -e

echo "开始部署隐患上报系统..."

# 检查当前目录
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "错误: 请在项目根目录下运行此脚本"
    exit 1
fi

# 检查 Node.js 版本
NODE_VERSION=$(node -v)
if [[ ${NODE_VERSION:1:2} -lt 18 ]]; then
    echo "错误: 需要 Node.js 18.x 或更高版本"
    exit 1
fi

# 检查必要的目录
echo "检查目录..."
mkdir -p backend/uploads backend/logs backend/exports

# 进入后端目录
cd backend

# 安装依赖
echo "安装依赖..."
npm install

# 生成 Prisma 客户端
echo "生成 Prisma 客户端..."
npx prisma generate

# 运行数据库迁移
echo "运行数据库迁移..."
npx prisma migrate deploy

# 创建管理员账号
echo "创建管理员账号..."
node scripts/create-admin.js

# 设置权限
echo "设置目录权限..."
chmod -R 755 uploads logs exports

# 配置 PM2
echo "配置 PM2..."
if ! pm2 list | grep -q "hazard-report"; then
    pm2 start app.js --name "hazard-report" --time
else
    pm2 restart hazard-report
fi

# 保存 PM2 配置
pm2 save

# 返回项目根目录
cd ..

echo "部署完成！" 