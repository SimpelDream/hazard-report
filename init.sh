#!/bin/bash

# 设置错误时退出
set -e

echo "开始初始化服务器环境..."

# 更新系统
echo "更新系统..."
apt-get update
apt-get upgrade -y

# 安装必要的软件包
echo "安装必要的软件包..."
apt-get install -y \
    curl \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    build-essential

# 安装 Node.js 18.x
echo "安装 Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安装 PM2
echo "安装 PM2..."
npm install -g pm2

# 创建项目目录
echo "创建项目目录..."
mkdir -p /var/www/html
cd /var/www/html

# 克隆项目
echo "克隆项目..."
git clone https://github.com/SimpelDream/hazard-report.git .
chown -R www-data:www-data /var/www/html

# 配置 SSL 证书
echo "配置 SSL 证书..."
certbot --nginx -d 8.148.69.112 --non-interactive --agree-tos --email admin@example.com

# 配置 Nginx
echo "配置 Nginx..."
cp nginx.conf /etc/nginx/nginx.conf
nginx -t
systemctl restart nginx

# 设置 PM2 开机自启
echo "配置 PM2 开机自启..."
pm2 startup
pm2 save

echo "初始化完成！"
echo "请运行 ./deploy.sh 开始部署应用。" 