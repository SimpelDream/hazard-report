#!/bin/bash

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 设置日志文件
LOGDIR="logs"
mkdir -p $LOGDIR
LOGFILE="$LOGDIR/update_$(date +%Y%m%d_%H%M%S).log"
touch $LOGFILE

# 输出带颜色的日志函数
log() {
    echo -e "${2:-$GREEN}[+] $1${NC}"
    echo "[+] $(date +"%Y-%m-%d %H:%M:%S") - $1" >> $LOGFILE
}

error() {
    echo -e "${RED}[-] $1${NC}"
    echo "[-] $(date +"%Y-%m-%d %H:%M:%S") - ERROR: $1" >> $LOGFILE
    if [ "$2" == "exit" ]; then
        echo -e "${RED}[-] 因错误终止脚本执行${NC}"
        echo "[-] $(date +"%Y-%m-%d %H:%M:%S") - 因错误终止脚本执行" >> $LOGFILE
        exit 1
    fi
}

warn() {
    echo -e "${YELLOW}[!] $1${NC}"
    echo "[!] $(date +"%Y-%m-%d %H:%M:%S") - WARNING: $1" >> $LOGFILE
}

info() {
    echo -e "${BLUE}[*] $1${NC}"
    echo "[*] $(date +"%Y-%m-%d %H:%M:%S") - INFO: $1" >> $LOGFILE
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        error "$1 未安装" 
        return 1
    fi
    return 0
}

# 显示帮助信息
show_help() {
    echo -e "用法: ./$(basename $0) [选项]"
    echo -e "选项:"
    echo -e "  -h, --help     显示帮助信息"
    echo -e "  -b, --backup   在更新前创建数据库备份"
    echo -e "  -s, --skip-db  跳过数据库重置（保留现有数据）"
    echo -e "  -f, --force    强制更新，忽略本地修改"
    exit 0
}

# 解析命令行参数
BACKUP=false
SKIP_DB=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            ;;
        -b|--backup)
            BACKUP=true
            shift
            ;;
        -s|--skip-db)
            SKIP_DB=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        *)
            warn "未知参数: $1"
            shift
            ;;
    esac
done

log "===== 开始更新 $(date) =====" "$BLUE"

# 检查必要的命令
log "检查必要的命令..."
for cmd in node npm git pm2; do
    if ! check_command $cmd; then
        error "请先安装 $cmd" "exit"
    fi
done

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
REQUIRED_VERSION="18.0.0"
if [[ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]]; then
    warn "当前Node.js版本 $NODE_VERSION 低于推荐版本 $REQUIRED_VERSION"
    warn "可能会出现兼容性问题，建议升级Node.js"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "用户取消更新" "exit"
    fi
fi

# 检查项目目录
if [ ! -d ".git" ]; then
    error "当前目录不是有效的 Git 仓库" "exit"
fi

# 检查工作区状态
if [ "$FORCE" = false ]; then
    if [[ -n $(git status -s) ]]; then
        info "检测到本地有未提交的修改"
        git status -s
        read -p "是否继续更新? 本地修改将会被临时保存 (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "用户取消更新" "exit"
        fi
    fi
fi

# 创建备份
if [ "$BACKUP" = true ]; then
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    log "创建备份目录 $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    
    log "备份数据库..."
    if [ -f "backend/prisma/dev.db" ]; then
        cp backend/prisma/dev.db "$BACKUP_DIR/"
        if [ $? -ne 0 ]; then
            error "数据库备份失败"
        else
            log "数据库备份成功: $BACKUP_DIR/dev.db"
        fi
    else
        warn "找不到数据库文件 backend/prisma/dev.db"
    fi
fi

# 保存本地修改
if [ "$FORCE" = true ]; then
    log "强制更新模式，忽略本地修改..."
    git reset --hard
else
    log "保存本地修改..."
    git stash
    if [ $? -ne 0 ]; then
        warn "保存本地修改失败，可能没有需要保存的修改"
    fi
fi

# 拉取最新代码
log "拉取最新代码..."
git pull
if [ $? -ne 0 ]; then
    error "拉取代码失败" "exit"
fi

# 恢复本地修改
if [ "$FORCE" = false ]; then
    log "恢复本地修改..."
    git stash pop
    if [ $? -ne 0 ]; then
        warn "恢复本地修改失败，可能没有保存的修改或出现冲突"
    fi
fi

# 更新后端依赖
log "更新后端依赖..."
cd backend || { error "无法进入后端目录" "exit"; }
npm install
if [ $? -ne 0 ]; then
    error "安装后端依赖失败"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "用户取消更新" "exit"
    fi
fi

if [ "$SKIP_DB" = false ]; then
    # 清理并重置数据库
    log "清理并重置数据库..."
    rm -f prisma/dev.db
    if [ -d "prisma/migrations" ]; then
        rm -rf prisma/migrations/*
        mkdir -p prisma/migrations
    else
        mkdir -p prisma/migrations
    fi

    # 创建新的迁移
    log "创建新的迁移..."
    npx prisma migrate dev --name init
    if [ $? -ne 0 ]; then
        error "创建数据库迁移失败"
        read -p "是否继续? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "用户取消更新" "exit"
        fi
    fi
else
    log "跳过数据库重置..."
fi

# 编译 TypeScript
log "编译 TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    error "TypeScript 编译失败"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "用户取消更新" "exit"
    fi
fi

# 生成 Prisma 客户端
log "生成 Prisma 客户端..."
npx prisma generate
if [ $? -ne 0 ]; then
    error "生成 Prisma 客户端失败"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "用户取消更新" "exit"
    fi
fi

# 执行数据库迁移
if [ "$SKIP_DB" = false ]; then
    log "执行数据库迁移..."
    npx prisma migrate deploy
    if [ $? -ne 0 ]; then
        error "执行数据库迁移失败"
        read -p "是否继续? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "用户取消更新" "exit"
        fi
    fi
fi

# 检查 PM2 是否已经有服务在运行
log "检查服务状态..."
if pm2 list | grep -q "hazard-report-api"; then
    log "重启后端服务..."
    pm2 restart hazard-report-api
    if [ $? -ne 0 ]; then
        error "重启服务失败"
    fi
else
    log "启动后端服务..."
    pm2 start ecosystem.config.js
    if [ $? -ne 0 ]; then
        error "启动服务失败"
    fi
fi

# 返回到项目根目录
cd ..

# 清理旧日志文件 (保留最近 7 天的日志)
find $LOGDIR -name "update_*.log" -type f -mtime +7 -delete

# 输出更新完成信息
log "===== 更新完成 $(date) =====" "$BLUE"
log "详细日志保存在: $LOGFILE"

# 显示服务状态
echo -e "\n${YELLOW}服务状态:${NC}"
pm2 list

# 可选: 显示网站访问信息
echo -e "\n${GREEN}更新成功!${NC}"
echo -e "${GREEN}前端访问地址: http://8.148.69.112${NC}"
echo -e "${GREEN}API 地址: http://8.148.69.112/api${NC}" 