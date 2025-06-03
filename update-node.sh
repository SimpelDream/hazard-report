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

# 停止所有 Node.js 相关服务
log "停止所有 Node.js 相关服务..."
pm2 stop all || true
pm2 delete all || true

# 卸载现有的 Node.js
log "卸载现有的 Node.js..."
apt-get remove -y nodejs npm
apt-get purge -y nodejs npm
apt-get autoremove -y

# 清理 Node.js 相关文件
log "清理 Node.js 相关文件..."
rm -rf /usr/local/bin/npm
rm -rf /usr/local/bin/node
rm -rf /usr/local/lib/node_modules
rm -rf ~/.npm
rm -rf ~/.node-gyp
rm -rf /opt/local/bin/node
rm -rf /opt/local/include/node
rm -rf /opt/local/lib/node_modules

# 删除 NodeSource 仓库
log "删除旧的 NodeSource 仓库..."
rm -rf /etc/apt/sources.list.d/nodesource.list*

# 更新包列表
log "更新包列表..."
apt-get update

# 安装必要的依赖
log "安装必要的依赖..."
apt-get install -y curl

# 添加 NodeSource 仓库（Node.js 22.x）
log "添加 NodeSource 仓库..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -

# 安装 Node.js
log "安装 Node.js 22.x..."
apt-get install -y nodejs

# 验证安装
log "验证安装..."
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)

log "Node.js 版本: $NODE_VERSION"
log "NPM 版本: $NPM_VERSION"

# 安装全局包
log "安装必要的全局包..."
npm install -g pm2

# 重新启动服务
log "重新启动服务..."
cd /var/www/hazard-report/backend
npm install --legacy-peer-deps
npm run build
pm2 start ecosystem.config.js

log "Node.js 更新完成！"
log "请检查以下内容："
log "1. 运行 'node -v' 确认版本"
log "2. 运行 'npm -v' 确认 npm 版本"
log "3. 检查 pm2 服务状态：'pm2 list'"
log "4. 检查应用日志：'pm2 logs'" 