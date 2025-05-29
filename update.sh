#!/bin/bash

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 设置日志文件
LOGFILE="update.log"
echo "===== 更新开始 $(date) =====" > $LOGFILE

# 输出带颜色的日志函数
log() {
    echo -e "${2:-$GREEN}[+] $1${NC}"
    echo "[+] $1" >> $LOGFILE
}

error() {
    echo -e "${RED}[-] $1${NC}"
    echo "[-] $1" >> $LOGFILE
}

warn() {
    echo -e "${YELLOW}[!] $1${NC}"
    echo "[!] $1" >> $LOGFILE
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        error "$1 未安装"
        return 1
    fi
    return 0
}

# 检查必要的命令
log "检查必要的命令..."
for cmd in node npm git pm2; do
    if ! check_command $cmd; then
        error "请先安装 $cmd"
        exit 1
    fi
done

# 检查项目目录
if [ ! -d ".git" ]; then
    error "当前目录不是有效的 Git 仓库"
    exit 1
fi

# 保存本地修改
log "保存本地修改..."
git stash

# 拉取最新代码
log "拉取最新代码..."
git pull

# 恢复本地修改
log "恢复本地修改..."
git stash pop

# 更新后端依赖
log "更新后端依赖..."
cd backend
npm install

# 清理并重置数据库
log "清理并重置数据库..."
rm -f prisma/dev.db
rm -rf prisma/migrations/*
mkdir -p prisma/migrations

# 创建新的迁移
log "创建新的迁移..."
npx prisma migrate dev --name init

# 编译 TypeScript
log "编译 TypeScript..."
npm run build

# 生成 Prisma 客户端
log "生成 Prisma 客户端..."
npx prisma generate

# 执行数据库迁移
log "执行数据库迁移..."
npx prisma migrate deploy

# 重启后端服务
log "重启后端服务..."
pm2 restart hazard-report-api

# 检查服务状态
log "检查服务状态..."
if pm2 list | grep -q "hazard-report-api"; then
    log "后端服务已重启"
else
    error "后端服务重启失败"
    exit 1
fi

# 输出更新完成信息
log "更新完成！"
log "详细日志请查看: $LOGFILE"

# 显示服务状态
echo -e "\n${YELLOW}服务状态:${NC}"
pm2 list 