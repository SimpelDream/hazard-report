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

# 错误处理函数
handle_error() {
    error "更新过程中出现错误，正在回滚..."
    git reset --hard HEAD
    exit 1
}

# 设置错误处理
set -e
trap 'handle_error' ERR

# 开始更新
log "===== 开始更新 $(date) ====="

sudo git reset --hard HEAD
sudo git clean -fd
sudo git pull origin main


cd /var/www/hazard-report/backend
sudo mkdir -p logs
sudo rm -f logs/*.log
sudo chown -R admin:admin logs
sudo chmod -R 755 logs
sudo chown -R admin:admin /var/www/hazard-report/backend
sudo chmod -R 755 /var/www/hazard-report/backend

cd /var/www/hazard-report/backend
pm2 delete hazard-report
pm2 start ecosystem.config.js --env production
pm2 save
pm2 list
cd /var/www/hazard-report


