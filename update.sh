#!/bin/bash

# 设置错误时立即退出
set -e

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查项目结构
if [ ! -d "backend" ]; then
    echo -e "${RED}[-] 找不到后端目录 'backend'${NC}"
    echo -e "${RED}[-] 请确保在项目根目录下运行此脚本${NC}"
    exit 1
fi

# 设置日志文件
LOGDIR="logs"
LOGFILE="$LOGDIR/update_$(date +%Y%m%d_%H%M%S).log"

# 确保日志目录存在
mkdir -p "$LOGDIR" 2>/dev/null || {
    echo -e "${RED}[-] 无法创建日志目录${NC}"
    exit 1
}

# 创建日志文件
touch "$LOGFILE" 2>/dev/null || {
    echo -e "${RED}[-] 无法创建日志文件${NC}"
    exit 1
}

# 输出带颜色的日志函数
log() {
    echo -e "${2:-$GREEN}[+] $1${NC}"
    echo "[+] $(date +"%Y-%m-%d %H:%M:%S") - $1" >> "$LOGFILE" 2>/dev/null || true
}

error() {
    echo -e "${RED}[-] $1${NC}"
    echo "[-] $(date +"%Y-%m-%d %H:%M:%S") - ERROR: $1" >> "$LOGFILE" 2>/dev/null || true
    if [ "$2" = "exit" ]; then
        echo -e "${RED}[-] 因错误终止脚本执行${NC}"
        echo "[-] $(date +"%Y-%m-%d %H:%M:%S") - 因错误终止脚本执行" >> "$LOGFILE" 2>/dev/null || true
        exit 1
    fi
}

warn() {
    echo -e "${YELLOW}[!] $1${NC}"
    echo "[!] $(date +"%Y-%m-%d %H:%M:%S") - WARNING: $1" >> "$LOGFILE" 2>/dev/null || true
}

info() {
    echo -e "${BLUE}[*] $1${NC}"
    echo "[*] $(date +"%Y-%m-%d %H:%M:%S") - INFO: $1" >> "$LOGFILE" 2>/dev/null || true
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

# 检查并配置 PostgreSQL
check_and_configure_postgresql() {
    log "检查 PostgreSQL 服务..."
    
    # 检查 PostgreSQL 是否安装
    if ! check_command psql; then
        warn "PostgreSQL 未安装，开始安装..."
        
        # 添加 PostgreSQL 官方源
        log "添加 PostgreSQL 官方源..."
        sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
        wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
        
        # 更新包列表
        sudo apt update
        
        # 安装 PostgreSQL
        log "安装 PostgreSQL..."
        sudo apt install -y postgresql postgresql-contrib
        
        # 检查安装是否成功
        if ! check_command psql; then
            error "PostgreSQL 安装失败" "exit"
        fi
    fi
    
    # 检查服务状态
    if ! sudo systemctl is-active --quiet postgresql; then
        warn "PostgreSQL 服务未运行，尝试启动服务..."
        
        # 检查服务文件是否存在
        if [ ! -f "/etc/systemd/system/postgresql.service" ] && [ ! -f "/lib/systemd/system/postgresql.service" ]; then
            error "PostgreSQL 服务文件不存在，尝试重新安装..." "exit"
            sudo apt remove -y postgresql postgresql-contrib
            sudo apt autoremove -y
            sudo apt install -y postgresql postgresql-contrib
        fi
        
        # 重新加载 systemd
        sudo systemctl daemon-reload
        
        # 启动服务
        sudo systemctl start postgresql
        
        # 检查启动是否成功
        if ! sudo systemctl is-active --quiet postgresql; then
            error "PostgreSQL 服务启动失败，尝试修复..."
            
            # 检查错误日志
            sudo journalctl -u postgresql --no-pager -n 50
            
            # 尝试修复权限
            sudo chown -R postgres:postgres /var/lib/postgresql
            sudo chmod 700 /var/lib/postgresql/*/main
            
            # 重新启动服务
            sudo systemctl restart postgresql
            
            # 再次检查服务状态
            if ! sudo systemctl is-active --quiet postgresql; then
                error "PostgreSQL 服务启动失败，请检查系统日志" "exit"
            fi
        fi
    fi
    
    # 配置 PostgreSQL
    log "配置 PostgreSQL..."
    
    # 查找 PostgreSQL 配置文件
    PG_CONF_DIR=$(sudo find /etc/postgresql -name "postgresql.conf" -type f 2>/dev/null | head -n 1 | xargs dirname)
    if [ -z "$PG_CONF_DIR" ]; then
        error "找不到 PostgreSQL 配置目录" "exit"
    fi
    
    # 获取 PostgreSQL 版本
    PG_VERSION=$(sudo -u postgres psql -t -c "SHOW server_version;" 2>/dev/null | cut -d. -f1)
    if [ -z "$PG_VERSION" ]; then
        error "无法获取 PostgreSQL 版本" "exit"
    fi
    
    # 配置 postgresql.conf
    if [ -f "$PG_CONF_DIR/postgresql.conf" ]; then
        sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF_DIR/postgresql.conf"
    else
        error "找不到 PostgreSQL 配置文件: $PG_CONF_DIR/postgresql.conf" "exit"
    fi
    
    # 配置 pg_hba.conf
    if [ -f "$PG_CONF_DIR/pg_hba.conf" ]; then
        if ! grep -q "host    all             all             0.0.0.0/0               md5" "$PG_CONF_DIR/pg_hba.conf"; then
            echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a "$PG_CONF_DIR/pg_hba.conf"
        fi
    else
        error "找不到 PostgreSQL 访问控制配置文件: $PG_CONF_DIR/pg_hba.conf" "exit"
    fi
    
    # 重启 PostgreSQL
    sudo systemctl restart postgresql
    
    # 等待服务完全启动
    sleep 5
    
    # 检查服务是否正常运行
    if ! sudo systemctl is-active --quiet postgresql; then
        error "PostgreSQL 服务重启失败" "exit"
    fi
    
    # 创建数据库和用户
    log "配置数据库和用户..."
    
    # 检查数据库是否存在
    if ! sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw hazard_report; then
        sudo -u postgres psql -c "CREATE DATABASE hazard_report;"
        if [ $? -ne 0 ]; then
            error "创建数据库失败" "exit"
        fi
    fi
    
    # 检查用户是否存在
    if ! sudo -u postgres psql -t -c "SELECT 1 FROM pg_roles WHERE rolname='hazard_user'" 2>/dev/null | grep -q 1; then
        sudo -u postgres psql -c "CREATE USER hazard_user WITH ENCRYPTED PASSWORD 'hazard_password';"
        if [ $? -ne 0 ]; then
            error "创建用户失败" "exit"
        fi
    fi
    
    # 授予权限
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hazard_report TO hazard_user;"
    if [ $? -ne 0 ]; then
        error "授予权限失败" "exit"
    fi
    
    # 配置数据库连接
    log "配置数据库连接..."
    
    # 测试数据库连接
    if ! PGPASSWORD=hazard_password psql -h localhost -U hazard_user -d hazard_report -c "\l" > /dev/null 2>&1; then
        error "数据库连接测试失败" "exit"
    fi
    
    # 检查 .env 文件是否存在
    if [ ! -f "backend/.env" ]; then
        cat > backend/.env << EOF
DATABASE_URL="postgresql://hazard_user:hazard_password@localhost:5432/hazard_report"
PORT=3000
NODE_ENV=production
CORS_ORIGIN="*"
JWT_SECRET="your-jwt-secret-key"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880
MAX_FILES=4
ALLOWED_TYPES="image/jpeg,image/png"
EOF
    else
        # 更新数据库连接字符串
        sed -i 's|^DATABASE_URL=.*|DATABASE_URL="postgresql://hazard_user:hazard_password@localhost:5432/hazard_report"|' backend/.env
    fi
    
    log "PostgreSQL 配置完成"
}

# 检查Node.js版本
check_node_version() {
    log "检查Node.js版本..."
    NODE_VERSION=$(node -v 2>/dev/null || echo "v0.0.0")
    NODE_VERSION=${NODE_VERSION#v}
    NODE_MAJOR=${NODE_VERSION%%.*}
    
    if [ "$NODE_MAJOR" -lt 18 ]; then
        warn "当前Node.js版本 $NODE_VERSION 低于推荐版本 18.x"
        warn "开始安装 Node.js 18.x..."
        
        # 安装 Node.js 18.x
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
        
        # 验证安装
        NODE_VERSION=$(node -v)
        log "Node.js 已更新到版本 $NODE_VERSION"
    fi
}

# 检查项目结构
check_project_structure() {
    log "检查项目结构..."
    
    # 检查必要的目录和文件
    local required_files=(
        "backend/prisma/schema.prisma"
        "backend/package.json"
        "backend/tsconfig.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            error "找不到必要文件: $file" "exit"
        fi
    done
    
    # 创建必要的目录
    mkdir -p backend/logs 2>/dev/null || warn "创建日志目录失败"
    mkdir -p backend/uploads 2>/dev/null || warn "创建上传目录失败"
    mkdir -p backend/prisma 2>/dev/null || warn "创建prisma目录失败"
    
    # 设置目录权限
    chmod -R 755 backend 2>/dev/null || warn "设置目录权限失败"
    chmod -R 777 backend/uploads 2>/dev/null || warn "设置上传目录权限失败"
    chmod -R 777 backend/logs 2>/dev/null || warn "设置日志目录权限失败"
}

# 检查并安装依赖
check_dependencies() {
    log "检查依赖..."
    
    # 检查必要的命令
    for cmd in node npm git; do
        if ! check_command $cmd; then
            warn "$cmd 未安装，开始安装..."
            case $cmd in
                node|npm)
                    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
                    sudo apt install -y nodejs
                    ;;
                git)
                    sudo apt install -y git
                    ;;
            esac
        fi
    done
    
    # 检查 PM2
    if ! check_command pm2; then
        warn "PM2 未安装，将尝试全局安装..."
        sudo npm install -g pm2
        if [ $? -ne 0 ]; then
            error "安装 PM2 失败，请手动安装后再运行脚本"
            error "使用命令: sudo npm install -g pm2" "exit"
        fi
    fi
}

# 在启动服务之前添加问题排查函数
check_and_fix_issues() {
    log "开始排查系统问题..."
    
    # 首先检查项目结构
    check_project_structure
    
    # 检查并配置 PostgreSQL
    check_and_configure_postgresql
    
    # 1. 检查端口占用
    log "检查端口占用..."
    if lsof -i :3000 > /dev/null 2>&1; then
        warn "端口 3000 已被占用，尝试释放..."
        lsof -i :3000 | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || warn "无法释放端口"
    fi
    
    # 2. 检查数据库
    log "检查数据库..."
    cd backend || { error "无法进入后端目录" "exit"; }
    
    # 确保在正确的目录下执行 Prisma 命令
    if [ ! -f "prisma/schema.prisma" ]; then
        error "找不到 Prisma schema 文件" "exit"
    fi
    
    # 生成 Prisma 客户端
    log "生成 Prisma 客户端..."
    npx prisma generate --schema=./prisma/schema.prisma
    if [ $? -ne 0 ]; then
        error "生成 Prisma 客户端失败" "exit"
    fi
    
    # 执行数据库迁移
    log "执行数据库迁移..."
    if [ "$SKIP_DB" = false ]; then
        # 重置数据库
        npx prisma migrate reset --force --schema=./prisma/schema.prisma
        if [ $? -ne 0 ]; then
            error "数据库重置失败" "exit"
        fi
    else
        # 只应用迁移
        npx prisma migrate deploy --schema=./prisma/schema.prisma
        if [ $? -ne 0 ]; then
            error "数据库迁移失败" "exit"
        fi
    fi
    
    cd ..
    
    # 3. 检查环境变量
    log "检查环境变量..."
    if [ ! -f "backend/.env" ]; then
        warn "环境配置文件不存在，创建默认配置..."
        cat > backend/.env << EOF
DATABASE_URL="postgresql://hazard_user:hazard_password@localhost:5432/hazard_report"
PORT=3000
NODE_ENV=production
CORS_ORIGIN="*"
JWT_SECRET="your-jwt-secret-key"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880
MAX_FILES=4
ALLOWED_TYPES="image/jpeg,image/png"
EOF
    else
        # 验证环境变量是否完整
        required_vars=(
            "DATABASE_URL"
            "PORT"
            "NODE_ENV"
            "CORS_ORIGIN"
            "JWT_SECRET"
            "UPLOAD_DIR"
            "MAX_FILE_SIZE"
            "MAX_FILES"
            "ALLOWED_TYPES"
        )
        
        for var in "${required_vars[@]}"; do
            if ! grep -q "^$var=" backend/.env; then
                warn "环境变量 $var 缺失，添加默认值..."
                case $var in
                    "DATABASE_URL") echo "DATABASE_URL=\"postgresql://hazard_user:hazard_password@localhost:5432/hazard_report\"" >> backend/.env ;;
                    "PORT") echo "PORT=3000" >> backend/.env ;;
                    "NODE_ENV") echo "NODE_ENV=production" >> backend/.env ;;
                    "CORS_ORIGIN") echo "CORS_ORIGIN=\"*\"" >> backend/.env ;;
                    "JWT_SECRET") echo "JWT_SECRET=\"your-jwt-secret-key\"" >> backend/.env ;;
                    "UPLOAD_DIR") echo "UPLOAD_DIR=\"./uploads\"" >> backend/.env ;;
                    "MAX_FILE_SIZE") echo "MAX_FILE_SIZE=5242880" >> backend/.env ;;
                    "MAX_FILES") echo "MAX_FILES=4" >> backend/.env ;;
                    "ALLOWED_TYPES") echo "ALLOWED_TYPES=\"image/jpeg,image/png\"" >> backend/.env ;;
                esac
            fi
        done
    fi
    
    # 4. 检查Node.js版本和依赖
    log "检查Node.js版本和依赖..."
    cd backend || { error "无法进入后端目录" "exit"; }
    
    # 检查 package.json 是否存在
    if [ ! -f "package.json" ]; then
        error "找不到 package.json 文件" "exit"
    fi
    
    # 安装依赖
    npm install
    if [ $? -ne 0 ]; then
        error "安装依赖失败" "exit"
    fi
    
    cd ..
    
    log "问题排查完成"
}

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

# 检查依赖
check_dependencies

# 检查Node.js版本
check_node_version

# 检查项目目录
if [ ! -d ".git" ]; then
    warn "当前目录不是Git仓库，尝试初始化"
    git init
    git remote add origin https://github.com/yourusername/hazard-report.git
    # 请替换上面的URL为您的实际仓库地址
fi

# 强制重置本地修改
log "更新代码..."
git fetch origin 2>/dev/null || error "Git fetch失败，检查网络连接" "exit"

# 保存需要保留的文件
log "备份运行时文件..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 需要保留的文件和目录列表
PRESERVE_FILES=(
    "logs"
    "backend/logs"
    "backend/uploads"
    "backend/prisma/dev.db"
    "backend/.env"
)

# 备份需要保留的文件
for item in "${PRESERVE_FILES[@]}"; do
    if [ -e "$item" ]; then
        mkdir -p "$BACKUP_DIR/$(dirname "$item")"
        cp -r "$item" "$BACKUP_DIR/$item" 2>/dev/null || warn "无法备份 $item"
    fi
done

# 重置代码
git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null || error "重置失败，检查分支名称" "exit"
git clean -fd 2>/dev/null || warn "清理工作目录失败"

# 恢复备份的文件
log "恢复运行时文件..."
for item in "${PRESERVE_FILES[@]}"; do
    if [ -e "$BACKUP_DIR/$item" ]; then
        mkdir -p "$(dirname "$item")"
        cp -r "$BACKUP_DIR/$item" "$item" 2>/dev/null || warn "无法恢复 $item"
    fi
done

# 清理备份目录
rm -rf "$BACKUP_DIR" 2>/dev/null || warn "清理备份目录失败"

log "更新完成，已保留运行时文件"

# 在启动服务之前调用问题排查函数
check_and_fix_issues

# 检查 PM2 是否已经有服务在运行
log "检查服务状态..."
if pm2 list | grep -q "hazard-report-api" 2>/dev/null; then
    log "停止后端服务..."
    pm2 stop hazard-report-api
    if [ $? -ne 0 ]; then
        warn "停止服务失败，尝试强制删除..."
        pm2 delete hazard-report-api
    fi
fi

# 启动服务
log "启动后端服务..."
cd backend || { error "无法进入后端目录" "exit"; }

# 使用更详细的启动配置
pm2 start ecosystem.config.js --update-env
if [ $? -ne 0 ]; then
    error "启动服务失败，检查错误日志..."
    pm2 logs hazard-report-api --lines 50
    error "服务启动失败，请检查日志" "exit"
fi

# 等待服务启动
log "等待服务启动..."
sleep 5

# 检查服务状态
if ! pm2 list | grep -q "hazard-report-api.*online"; then
    error "服务未正常启动，显示错误日志..."
    pm2 logs hazard-report-api --lines 50
    error "服务启动失败，请检查日志" "exit"
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

# 显示最近的错误日志
echo -e "\n${YELLOW}最近的错误日志:${NC}"
pm2 logs hazard-report-api --lines 20 2>/dev/null || echo "无法获取错误日志"

# 获取服务器IP或域名
SERVER_ADDRESS=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$SERVER_ADDRESS" ]; then
    SERVER_ADDRESS="当前服务器"
fi

# 可选: 显示网站访问信息
echo -e "\n${GREEN}更新成功!${NC}"
echo -e "${GREEN}前端访问地址: http://$SERVER_ADDRESS${NC}"
echo -e "${GREEN}API 地址: http://$SERVER_ADDRESS/api${NC}"
