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
log "===== 开始修复 Node.js 版本 $(date) ====="

# 1. 卸载当前 Node.js
log "卸载当前 Node.js..."
apt-get remove -y nodejs npm
apt-get autoremove -y

# 2. 安装 Node.js 18.x
log "安装 Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 3. 验证版本
log "验证 Node.js 版本..."
node -v
npm -v

# 4. 重新安装 PM2
log "重新安装 PM2..."
npm install -g pm2

# 5. 重新安装项目依赖
log "重新安装项目依赖..."
cd /var/www/hazard-report/backend
rm -rf node_modules package-lock.json
npm install

# 6. 重新构建项目
log "重新构建项目..."
npm run build

# 7. 重启服务
log "重启服务..."
pm2 delete all
pm2 start ecosystem.config.js

log "修复完成！"
log "请检查以下内容："
log "1. Node.js 版本是否为 18.x"
log "2. PM2 进程是否正常运行"
log "3. 后端服务是否正常响应" 