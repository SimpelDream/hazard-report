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

# 检查服务状态
log "检查 PM2 进程状态..."
pm2 list

log "检查 Nginx 状态..."
systemctl status nginx

log "检查 PostgreSQL 状态..."
systemctl status postgresql

log "检查后端日志..."
tail -n 50 /var/www/hazard-report/backend/logs/app.log

log "检查 Nginx 错误日志..."
tail -n 50 /var/log/nginx/error.log

log "检查后端服务端口..."
netstat -tulpn | grep :3000

log "检查 Nginx 配置..."
nginx -t

log "检查环境变量..."
cat /var/www/hazard-report/backend/.env

log "检查数据库连接..."
sudo -u postgres psql -c "\l" | grep hazard_report

log "检查文件权限..."
ls -la /var/www/hazard-report/backend/uploads
ls -la /var/www/html/uploads 