#!/bin/bash

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 设置日志文件
LOGDIR="logs"
mkdir -p $LOGDIR 2>/dev/null || true
LOGFILE="$LOGDIR/update_$(date +%Y%m%d_%H%M%S).log"
touch $LOGFILE 2>/dev/null || echo "无法创建日志文件，将只输出到控制台"

# 输出带颜色的日志函数
log() {
    echo -e "${2:-$GREEN}[+] $1${NC}"
    echo "[+] $(date +"%Y-%m-%d %H:%M:%S") - $1" >> $LOGFILE 2>/dev/null || true
}

error() {
    echo -e "${RED}[-] $1${NC}"
    echo "[-] $(date +"%Y-%m-%d %H:%M:%S") - ERROR: $1" >> $LOGFILE 2>/dev/null || true
    if [ "$2" = "exit" ]; then
        echo -e "${RED}[-] 因错误终止脚本执行${NC}"
        echo "[-] $(date +"%Y-%m-%d %H:%M:%S") - 因错误终止脚本执行" >> $LOGFILE 2>/dev/null || true
        exit 1
    fi
}

warn() {
    echo -e "${YELLOW}[!] $1${NC}"
    echo "[!] $(date +"%Y-%m-%d %H:%M:%S") - WARNING: $1" >> $LOGFILE 2>/dev/null || true
}

info() {
    echo -e "${BLUE}[*] $1${NC}"
    echo "[*] $(date +"%Y-%m-%d %H:%M:%S") - INFO: $1" >> $LOGFILE 2>/dev/null || true
}

# 检查命令是否存在
check_command() {
    command -v $1 >/dev/null 2>&1
    if [ $? -ne 0 ]; then
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
    echo -e "  -y, --yes      自动确认所有提示（非交互模式）"
    exit 0
}

# 解析命令行参数
BACKUP=false
SKIP_DB=false
FORCE=false
AUTO_YES=false

while [ $# -gt 0 ]; do
    case "$1" in
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

# 检查必要的命令
log "检查必要的命令..."
for cmd in node npm git; do
    if ! check_command $cmd; then
        error "请先安装 $cmd" "exit"
    fi
done

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
    error "当前目录不是有效的 Git 仓库，请确保在项目根目录运行此脚本" "exit"
fi

# 检查工作区状态
if [ "$FORCE" = false ]; then
    GIT_STATUS=$(git status -s 2>/dev/null)
    if [ -n "$GIT_STATUS" ]; then
        info "检测到本地有未提交的修改"
        echo "$GIT_STATUS"
        
        if [ "$AUTO_YES" = false ]; then
            read -p "是否继续更新? 本地修改将会被临时保存 (y/n) " REPLY
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "用户取消更新" "exit"
            fi
        else
            warn "自动确认模式：继续执行并保存本地修改"
        fi
    fi
fi

# 创建备份
if [ "$BACKUP" = true ]; then
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    log "创建备份目录 $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR" 2>/dev/null || { error "无法创建备份目录"; BACKUP=false; }
    
    if [ "$BACKUP" = true ] && [ -f "backend/prisma/dev.db" ]; then
        log "备份数据库..."
        cp backend/prisma/dev.db "$BACKUP_DIR/" 2>/dev/null
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
    git reset --hard 2>/dev/null || error "重置工作区失败"
else
    log "保存本地修改..."
    git stash 2>/dev/null
    if [ $? -ne 0 ]; then
        warn "保存本地修改失败，可能没有需要保存的修改"
    fi
fi

# 拉取最新代码
log "拉取最新代码..."
git pull 2>/dev/null
if [ $? -ne 0 ]; then
    error "拉取代码失败，请检查网络连接和仓库权限" "exit"
fi

# 恢复本地修改
if [ "$FORCE" = false ]; then
    log "恢复本地修改..."
    git stash pop 2>/dev/null
    if [ $? -ne 0 ]; then
        warn "恢复本地修改失败，可能没有保存的修改或出现冲突"
    fi
fi

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

# 编译 TypeScript
log "编译 TypeScript..."
npm run build
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

# 生成 Prisma 客户端
log "生成 Prisma 客户端..."
npx prisma generate
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

# 输出更新完成信息
log "===== 更新完成 $(date) =====" "$BLUE"
log "详细日志保存在: $LOGFILE"

# 显示服务状态
echo -e "\n${YELLOW}服务状态:${NC}"
pm2 list 2>/dev/null || echo "无法获取服务状态"

# 获取服务器IP或域名
SERVER_ADDRESS=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$SERVER_ADDRESS" ]; then
    SERVER_ADDRESS="当前服务器"
fi

# 可选: 显示网站访问信息
echo -e "\n${GREEN}更新成功!${NC}"
echo -e "${GREEN}前端访问地址: http://$SERVER_ADDRESS${NC}"
echo -e "${GREEN}API 地址: http://$SERVER_ADDRESS/api${NC}" 