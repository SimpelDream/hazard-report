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

# 设置项目目录
PROJECT_DIR="/var/www/hazard-report"
REPO_URL="https://github.com/SimpelDream/hazard-report.git"

# 检查项目目录是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    error "项目目录不存在: $PROJECT_DIR"
    exit 1
fi

# 进入项目目录
cd $PROJECT_DIR

# 检查是否是 git 仓库
if [ ! -d ".git" ]; then
    error "当前目录不是 git 仓库"
    exit 1
fi

# 检查远程仓库
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [ "$REMOTE_URL" != "$REPO_URL" ]; then
    warn "远程仓库地址不匹配，正在更新..."
    git remote set-url origin $REPO_URL
fi

# 保存当前分支
CURRENT_BRANCH=$(git symbolic-ref --short HEAD)

# 获取最新代码
log "获取最新代码..."
git fetch origin

# 检查是否有更新
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
    log "当前代码已是最新版本"
else
    log "发现新版本，正在更新..."
    
    # 保存当前修改
    if ! git diff-index --quiet HEAD --; then
        warn "发现本地修改，正在保存..."
        git stash
    fi
    
    # 拉取最新代码
    git pull origin $CURRENT_BRANCH
    
    # 恢复本地修改
    if git stash list | grep -q "stash@{0}"; then
        log "恢复本地修改..."
        git stash pop
    fi
fi

# 安装后端依赖
log "更新后端依赖..."
cd $PROJECT_DIR/backend
npm install

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
if pm2 list | grep -q "hazard-report-api.*online"; then
    log "后端服务已重启"
else
    error "后端服务重启失败"
    exit 1
fi

# 输出更新完成信息
log "更新完成！"
log "前端访问地址: http://8.148.69.112"
log "API 地址: http://8.148.69.112/api"
log "详细日志请查看: $LOGFILE"

# 显示服务状态
echo -e "\n${YELLOW}服务状态:${NC}"
pm2 list 