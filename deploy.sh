#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[+] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[!] $1${NC}"
}

error() {
    echo -e "${RED}[-] $1${NC}"
}

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
    error "请使用 sudo 运行此脚本"
    exit 1
fi

# 开始部署
log "===== 开始部署 $(date) ====="

# 安装系统依赖
log "安装系统依赖..."
apt-get update
apt-get install -y \
    curl \
    git \
    postgresql \
    postgresql-contrib \
    nginx \
    build-essential

# 安装 Node.js 18.x
log "安装 Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安装 PM2
log "安装 PM2..."
npm install -g pm2

# 创建项目目录
log "创建项目目录..."
mkdir -p /var/www
cd /var/www

# 克隆项目
log "克隆项目..."
if [ ! -d "hazard-report" ]; then
    git clone https://github.com/SimpelDream/hazard-report.git
fi

cd hazard-report

# 配置 PostgreSQL
log "配置 PostgreSQL..."
sudo -u postgres psql -c "CREATE USER hazard_report WITH PASSWORD 'hazard_report';" || true
sudo -u postgres psql -c "CREATE DATABASE hazard_report;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hazard_report TO hazard_report;" || true

# 配置 Nginx
log "配置 Nginx..."
cp nginx.conf /etc/nginx/nginx.conf
mkdir -p /var/www/html/uploads
chown -R www-data:www-data /var/www/html

# 设置后端
log "设置后端..."
cd backend

# 安装依赖
log "安装依赖..."
npm install --no-fund --no-audit

# 创建必要的目录
log "创建必要的目录..."
mkdir -p uploads logs

# 配置环境变量
log "配置环境变量..."
cat > .env << EOL
DATABASE_URL="postgresql://hazard_report:hazard_report@localhost:5432/hazard_report"
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost
UPLOAD_DIR=uploads
LOG_DIR=logs
MAX_FILE_SIZE=5242880
MAX_FILES=4
ALLOWED_TYPES=image/jpeg,image/png
EOL

# 执行数据库迁移
log "执行数据库迁移..."
npx prisma generate
npx prisma migrate deploy

# 构建项目
log "构建项目..."
npm run build

# 启动服务
log "启动服务..."
pm2 start ecosystem.config.js

# 配置 PM2 开机自启
log "配置 PM2 开机自启..."
pm2 startup
pm2 save

# 重启 Nginx
log "重启 Nginx..."
systemctl restart nginx

# 检查服务状态
log "检查服务状态..."
if ! pm2 list | grep -q "hazard-report"; then
    error "后端服务未正常运行"
    exit 1
fi

if ! systemctl is-active --quiet nginx; then
    error "Nginx 服务未正常运行"
    exit 1
fi

log "部署完成！"
log "请检查以下内容："
log "1. 访问 http://localhost 确认前端是否正常"
log "2. 访问 http://localhost/api/v1/health 确认后端是否正常"
log "3. 检查日志文件是否有错误信息"
log "4. 检查数据库连接是否正常"
log "5. 检查文件上传功能是否正常" 