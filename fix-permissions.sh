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
log "===== 开始修复权限 $(date) ====="

# 1. 修复项目目录权限
log "修复项目目录权限..."
cd /var/www/hazard-report

# 设置目录所有权
chown -R admin:admin .

# 设置目录权限
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;

# 设置可执行文件权限
chmod +x *.sh
chmod +x backend/*.sh

# 2. 修复后端目录权限
log "修复后端目录权限..."
cd /var/www/hazard-report/backend

# 创建必要的目录
mkdir -p logs uploads

# 设置目录权限
chmod -R 755 .
chmod -R 777 logs uploads

# 3. 修复前端目录权限
log "修复前端目录权限..."
cd /var/www/hazard-report/frontend
chmod -R 755 .

# 4. 修复 Nginx 目录权限
log "修复 Nginx 目录权限..."
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html
chmod -R 777 /var/www/html/uploads

# 5. 修复日志目录权限
log "修复日志目录权限..."
mkdir -p /var/log/nginx
chown -R www-data:www-data /var/log/nginx
chmod -R 755 /var/log/nginx

# 6. 清理并重新安装依赖
log "清理并重新安装依赖..."
cd /var/www/hazard-report/backend

# 使用 sudo 删除 node_modules
sudo rm -rf node_modules package-lock.json

# 重新安装依赖
npm install

# 7. 重启服务
log "重启服务..."
pm2 delete all
pm2 start ecosystem.config.js

# 重启 Nginx
systemctl restart nginx

log "修复完成！"
log "请检查以下内容："
log "1. 目录权限是否正确"
log "2. 服务是否正常运行"
log "3. 日志是否正常写入" 