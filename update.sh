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

# 检查 Node.js 版本
log "检查 Node.js 版本..."
NODE_VERSION=$(node -v | cut -d'v' -f2)
if [[ $(echo "$NODE_VERSION 18.20.8" | awk '{print ($1 != $2)}') -eq 1 ]]; then
    warn "Node.js 版本不匹配，请先运行 update-node.sh 安装 Node.js 18.20.8"
    exit 1
fi

# 检查并安装 PM2
if ! command -v pm2 &> /dev/null; then
    log "安装 PM2..."
    sudo npm install -g pm2
fi

# 重置本地更改并更新代码
log "重置本地更改并更新代码..."
git reset --hard HEAD
git clean -fd
git pull

# 检查项目结构
log "检查项目结构..."
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    error "项目结构不完整"
    exit 1
fi

# 检查 PostgreSQL 服务
log "检查 PostgreSQL 服务..."
if ! systemctl is-active --quiet postgresql; then
    warn "PostgreSQL 服务未运行，正在启动..."
    sudo systemctl start postgresql
fi

# 配置 PostgreSQL
log "配置 PostgreSQL..."
sudo -u postgres psql -c "ALTER USER hazard_report WITH PASSWORD 'hazard_report';" || true
sudo -u postgres psql -c "CREATE DATABASE hazard_report;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hazard_report TO hazard_report;" || true

# 进入后端目录
cd backend

# 清理旧的依赖
log "清理旧的依赖..."
rm -rf node_modules package-lock.json

# 安装依赖
log "安装依赖..."
npm install --no-fund --no-audit

# 修复安全漏洞
log "修复安全漏洞..."
npm audit fix --force || true

# 清理 npm 缓存
log "清理 npm 缓存..."
npm cache clean --force

# 重新安装依赖
log "重新安装依赖..."
npm install --no-fund --no-audit

# 重新构建项目
log "重新构建项目..."
npm run build

# 执行数据库迁移
log "执行数据库迁移..."
npx prisma generate
npx prisma migrate deploy

# 重启服务
log "重启服务..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

# 检查 Nginx 配置
log "检查 Nginx 配置..."
if ! sudo nginx -t; then
    error "Nginx 配置测试失败"
    exit 1
fi

# 重启 Nginx
sudo systemctl restart nginx

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

log "更新完成！"
log "请检查以下内容："
log "1. 访问 http://localhost 确认前端是否正常"
log "2. 访问 http://localhost/api/v1/health 确认后端是否正常"
log "3. 检查日志文件是否有错误信息"


