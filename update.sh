#!/bin/bash

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 设置日志文件
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
LOGDIR="logs"
mkdir -p $LOGDIR 2>/dev/null || true
LOGFILE="$LOGDIR/update_$(date +%Y%m%d_%H%M%S).log"
touch $LOGFILE 2>/dev/null || echo "无法创建日志文件，将只输出到控制台"
<<<<<<< HEAD
=======
=======
LOGFILE="update.log"
echo "===== 更新开始 $(date) =====" > $LOGFILE
>>>>>>> parent of 85b183f (改错17)
=======
LOGFILE="update.log"
echo "===== 更新开始 $(date) =====" > $LOGFILE
>>>>>>> parent of 85b183f (改错17)
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)

# 输出带颜色的日志函数
log() {
    echo -e "${2:-$GREEN}[+] $1${NC}"
<<<<<<< HEAD
    echo "[+] $(date +"%Y-%m-%d %H:%M:%S") - $1" >> $LOGFILE 2>/dev/null || true
=======
<<<<<<< HEAD
    echo "[+] $(date +"%Y-%m-%d %H:%M:%S") - $1" >> $LOGFILE 2>/dev/null || true
=======
    echo "[+] $1" >> $LOGFILE
>>>>>>> parent of 85b183f (改错17)
=======
    echo "[+] $1" >> $LOGFILE
>>>>>>> parent of 85b183f (改错17)
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
}

error() {
    echo -e "${RED}[-] $1${NC}"
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
    echo "[-] $(date +"%Y-%m-%d %H:%M:%S") - ERROR: $1" >> $LOGFILE 2>/dev/null || true
    if [ "$2" = "exit" ]; then
        echo -e "${RED}[-] 因错误终止脚本执行${NC}"
        echo "[-] $(date +"%Y-%m-%d %H:%M:%S") - 因错误终止脚本执行" >> $LOGFILE 2>/dev/null || true
        exit 1
    fi
<<<<<<< HEAD
=======
=======
    echo "[-] $1" >> $LOGFILE
>>>>>>> parent of 85b183f (改错17)
=======
    echo "[-] $1" >> $LOGFILE
>>>>>>> parent of 85b183f (改错17)
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
}

warn() {
    echo -e "${YELLOW}[!] $1${NC}"
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
    echo "[!] $(date +"%Y-%m-%d %H:%M:%S") - WARNING: $1" >> $LOGFILE 2>/dev/null || true
}

info() {
    echo -e "${BLUE}[*] $1${NC}"
    echo "[*] $(date +"%Y-%m-%d %H:%M:%S") - INFO: $1" >> $LOGFILE 2>/dev/null || true
<<<<<<< HEAD
=======
=======
    echo "[!] $1" >> $LOGFILE
>>>>>>> parent of 85b183f (改错17)
=======
    echo "[!] $1" >> $LOGFILE
>>>>>>> parent of 85b183f (改错17)
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
}

# 检查命令是否存在
check_command() {
<<<<<<< HEAD
    command -v $1 >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        error "$1 未安装" 
=======
<<<<<<< HEAD
    command -v $1 >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        error "$1 未安装" 
=======
    if ! command -v $1 &> /dev/null; then
        error "$1 未安装"
>>>>>>> parent of 85b183f (改错17)
=======
    if ! command -v $1 &> /dev/null; then
        error "$1 未安装"
>>>>>>> parent of 85b183f (改错17)
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
        return 1
    fi
    return 0
}

<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
# 显示帮助信息
show_help() {
    echo -e "用法: ./$(basename $0) [选项]"
    echo -e "选项:"
    echo -e "  -h, --help     显示帮助信息"
    echo -e "  -s, --skip-db  跳过数据库重置（保留现有数据）"
    echo -e "  -y, --yes      自动确认所有提示（非交互模式）"
    exit 0
}

# 解析命令行参数
SKIP_DB=false
AUTO_YES=false

while [ $# -gt 0 ]; do
    case "$1" in
        -h|--help)
            show_help
            ;;
        -s|--skip-db)
            SKIP_DB=true
            shift
            ;;
        -y|--yes)
            AUTO_YES=true
            shift
            ;;
        *)
            warn "未知参数: $1"
            shift
            ;;
    esac
done

log "===== 开始更新 $(date) =====" "$BLUE"

<<<<<<< HEAD
=======
=======
>>>>>>> parent of 85b183f (改错17)
=======
>>>>>>> parent of 85b183f (改错17)
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
# 检查必要的命令
log "检查必要的命令..."
for cmd in node npm git; do
    if ! check_command $cmd; then
        error "请先安装 $cmd" "exit"
    fi
done

<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
# 可选检查 PM2
if ! check_command pm2; then
    warn "PM2 未安装，将尝试全局安装..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        error "安装 PM2 失败，请手动安装后再运行脚本"
        error "使用命令: npm install -g pm2" "exit"
    fi
fi

# 检查Node.js版本（简化版本）
NODE_VERSION=$(node -v 2>/dev/null || echo "v0.0.0")
NODE_VERSION=${NODE_VERSION#v}
NODE_MAJOR=${NODE_VERSION%%.*}

if [ "$NODE_MAJOR" -lt 18 ]; then
    warn "当前Node.js版本 $NODE_VERSION 低于推荐版本 18.x"
    warn "可能会出现兼容性问题，建议升级Node.js"
    
    if [ "$AUTO_YES" = false ]; then
        read -p "是否继续? (y/n) " REPLY
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "用户取消更新" "exit"
        fi
    else
        warn "自动确认模式：继续执行"
    fi
fi

# 检查项目目录
if [ ! -d ".git" ]; then
    warn "当前目录不是Git仓库，尝试初始化"
    git init
    git remote add origin https://github.com/yourusername/hazard-report.git
    # 请替换上面的URL为您的实际仓库地址
fi

# 强制重置本地修改
log "强制重置本地修改..."
git fetch origin 2>/dev/null || error "Git fetch失败，检查网络连接" "exit"
git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null || error "重置失败，检查分支名称" "exit"
git clean -fd 2>/dev/null || warn "清理工作目录失败"

log "更新完成，现在本地代码与远程一致"

# 更新后端依赖
log "更新后端依赖..."
if [ ! -d "backend" ]; then
    error "找不到后端目录 'backend'" "exit"
fi

cd backend || { error "无法进入后端目录" "exit"; }
npm install
if [ $? -ne 0 ]; then
    error "安装后端依赖失败"
    if [ "$AUTO_YES" = false ]; then
        read -p "是否继续? (y/n) " REPLY
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "用户取消更新" "exit"
        fi
    else
        warn "自动确认模式：继续执行"
    fi
fi

if [ "$SKIP_DB" = false ]; then
    # 清理并重置数据库
    log "清理并重置数据库..."
    rm -f prisma/dev.db 2>/dev/null || warn "无法删除数据库文件"
    mkdir -p prisma/migrations 2>/dev/null || warn "无法创建迁移目录"
    rm -rf prisma/migrations/* 2>/dev/null || warn "无法清空迁移目录"

    # 创建新的迁移
    log "创建新的迁移..."
    npx prisma migrate dev --name init
    if [ $? -ne 0 ]; then
        error "创建数据库迁移失败"
        if [ "$AUTO_YES" = false ]; then
            read -p "是否继续? (y/n) " REPLY
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "用户取消更新" "exit"
            fi
        else
            warn "自动确认模式：继续执行"
        fi
    fi
else
    log "跳过数据库重置..."
fi
<<<<<<< HEAD
=======
=======
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
>>>>>>> parent of 85b183f (改错17)
=======
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
>>>>>>> parent of 85b183f (改错17)
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)

# 编译 TypeScript
log "编译 TypeScript..."
npm run build
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
if [ $? -ne 0 ]; then
    error "TypeScript 编译失败"
    if [ "$AUTO_YES" = false ]; then
        read -p "是否继续? (y/n) " REPLY
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "用户取消更新" "exit"
        fi
    else
        warn "自动确认模式：继续执行"
    fi
fi
<<<<<<< HEAD
=======
=======
>>>>>>> parent of 85b183f (改错17)
=======
>>>>>>> parent of 85b183f (改错17)
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)

# 生成 Prisma 客户端
log "生成 Prisma 客户端..."
npx prisma generate
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
if [ $? -ne 0 ]; then
    error "生成 Prisma 客户端失败"
    if [ "$AUTO_YES" = false ]; then
        read -p "是否继续? (y/n) " REPLY
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "用户取消更新" "exit"
        fi
    else
        warn "自动确认模式：继续执行"
    fi
fi

# 执行数据库迁移
if [ "$SKIP_DB" = false ]; then
    log "执行数据库迁移..."
    npx prisma migrate deploy
    if [ $? -ne 0 ]; then
        error "执行数据库迁移失败"
        if [ "$AUTO_YES" = false ]; then
            read -p "是否继续? (y/n) " REPLY
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "用户取消更新" "exit"
            fi
        else
            warn "自动确认模式：继续执行"
        fi
    fi
fi

# 检查 PM2 配置文件
if [ ! -f "ecosystem.config.js" ]; then
    warn "找不到PM2配置文件 'ecosystem.config.js'，将使用默认配置"
    echo "module.exports = {
  apps: [{
    name: 'hazard-report-api',
    script: 'app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    }
  }]
};" > ecosystem.config.js
    log "已创建默认 PM2 配置文件"
fi

# 检查 PM2 是否已经有服务在运行
log "检查服务状态..."
if pm2 list | grep -q "hazard-report-api" 2>/dev/null; then
    log "重启后端服务..."
    pm2 restart hazard-report-api
    if [ $? -ne 0 ]; then
        error "重启服务失败，尝试启动新实例..."
        pm2 start ecosystem.config.js
    fi
else
    log "启动后端服务..."
    pm2 start ecosystem.config.js
    if [ $? -ne 0 ]; then
        error "启动服务失败"
        if [ "$AUTO_YES" = false ]; then
            read -p "是否继续? (y/n) " REPLY
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "用户取消更新" "exit"
            fi
        else
            warn "自动确认模式：继续执行"
        fi
    fi
fi

# 返回到项目根目录
cd .. || warn "无法返回项目根目录"

# 清理旧日志文件 (保留最近 7 天的日志)
if [ -d "$LOGDIR" ]; then
    find "$LOGDIR" -name "update_*.log" -type f -mtime +7 -delete 2>/dev/null || warn "清理旧日志文件失败"
fi

<<<<<<< HEAD
=======
=======

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

>>>>>>> parent of 85b183f (改错17)
=======

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

>>>>>>> parent of 85b183f (改错17)
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
# 输出更新完成信息
log "===== 更新完成 $(date) =====" "$BLUE"
log "详细日志保存在: $LOGFILE"

# 显示服务状态
echo -e "\n${YELLOW}服务状态:${NC}"
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
pm2 list 2>/dev/null || echo "无法获取服务状态"

# 获取服务器IP或域名
SERVER_ADDRESS=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$SERVER_ADDRESS" ]; then
    SERVER_ADDRESS="当前服务器"
fi

# 可选: 显示网站访问信息
echo -e "\n${GREEN}更新成功!${NC}"
echo -e "${GREEN}前端访问地址: http://$SERVER_ADDRESS${NC}"
<<<<<<< HEAD
echo -e "${GREEN}API 地址: http://$SERVER_ADDRESS/api${NC}" 
=======
echo -e "${GREEN}API 地址: http://$SERVER_ADDRESS/api${NC}" 
=======
pm2 list 
>>>>>>> parent of 85b183f (改错17)
=======
pm2 list 
>>>>>>> parent of 85b183f (改错17)
<<<<<<< HEAD
>>>>>>> parent of 1393684 (回滚2)
=======
>>>>>>> parent of 1393684 (回滚2)
