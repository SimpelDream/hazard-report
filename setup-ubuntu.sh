#!/bin/bash

# 安装必要的系统依赖
sudo apt-get update
sudo apt-get install -y \
    postgresql \
    postgresql-contrib \
    nginx \
    nodejs \
    npm \
    curl

# 安装 Node.js 16.x
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 配置 PostgreSQL
sudo -u postgres psql -c "CREATE USER hazard_report WITH PASSWORD 'hazard_report';"
sudo -u postgres psql -c "CREATE DATABASE hazard_report OWNER hazard_report;"

# 配置 Nginx
sudo cp nginx.conf /etc/nginx/nginx.conf
sudo mkdir -p /var/www/html/uploads
sudo chown -R www-data:www-data /var/www/html

# 设置后端
cd backend
npm install
npx prisma generate
npx prisma migrate deploy

# 创建必要的目录
mkdir -p uploads logs

# 启动后端服务
pm2 start ecosystem.config.js

# 重启 Nginx
sudo systemctl restart nginx

echo "系统设置完成！" 