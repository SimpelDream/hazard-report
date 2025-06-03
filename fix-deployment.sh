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

# 开始修复
log "===== 开始修复部署 $(date) ====="

# 1. 修复 Nginx 配置
log "修复 Nginx 配置..."
if [ -f "/var/www/hazard-report/nginx.conf" ]; then
    cp /var/www/hazard-report/nginx.conf /etc/nginx/nginx.conf
else
    error "找不到 nginx.conf 文件"
    exit 1
fi

# 2. 修复前端文件
log "修复前端文件..."
if [ -d "/var/www/hazard-report/frontend" ]; then
    # 创建必要的目录
    mkdir -p /var/www/html
    mkdir -p /var/www/html/uploads

    # 复制前端文件
    cp -r /var/www/hazard-report/frontend/* /var/www/html/

    # 设置权限
    chown -R www-data:www-data /var/www/html
    chmod -R 755 /var/www/html
else
    error "找不到 frontend 目录"
    exit 1
fi

# 3. 修复后端
log "修复后端..."
cd /var/www/hazard-report/backend

# 创建必要的目录
mkdir -p logs
mkdir -p uploads

# 设置权限
chown -R admin:admin .
chmod -R 755 .

# 重新安装依赖
log "重新安装后端依赖..."
rm -rf node_modules package-lock.json
npm install

# 重新构建
log "重新构建后端..."
npm run build

# 4. 重启服务
log "重启服务..."

# 重启 PM2
pm2 delete all
pm2 start ecosystem.config.js

# 重启 Nginx
nginx -t && systemctl restart nginx

# 5. 检查服务状态
log "检查服务状态..."
if ! pm2 list | grep -q "hazard-report"; then
    error "后端服务未正常运行"
    exit 1
fi

if ! systemctl is-active --quiet nginx; then
    error "Nginx 服务未正常运行"
    exit 1
fi

log "修复完成！"
log "请检查以下内容："
log "1. 访问 http://localhost 确认前端是否正常"
log "2. 访问 http://localhost/api/v1/health 确认后端是否正常"
log "3. 检查日志文件是否有错误信息"
log "4. 检查数据库连接是否正常"
log "5. 检查文件上传功能是否正常" 