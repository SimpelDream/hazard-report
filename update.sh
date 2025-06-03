#!/bin/bash

# 设置错误时退出
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[+]${NC} $1"
}

error() {
    echo -e "${RED}[-]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# 清理函数
cleanup() {
    if [ $? -ne 0 ]; then
        error "更新过程中出现错误，正在回滚..."
        if [ -d "backup_$(date +%Y%m%d_%H%M%S)" ]; then
            rm -rf backend/logs backend/src/config backend/src/constants backend/src/errors backend/src/interfaces backend/src/models backend/src/routes/index.ts backend/src/services backend/src/types backend/src/validators
            cp -r backup_$(date +%Y%m%d_%H%M%S)/* .
            log "已回滚到备份版本"
        fi
    fi
}

# 注册清理函数
trap cleanup EXIT

# 开始更新
log "===== 开始更新 $(date) ====="

# 检查依赖
log "检查依赖..."
if ! command -v node &> /dev/null; then
    error "Node.js 未安装"
    exit 1
fi

# 检查Node.js版本
log "检查Node.js版本..."
NODE_VERSION=$(node -v)
if [[ ${NODE_VERSION:1:2} -lt 16 ]]; then
    error "Node.js 版本过低，需要 16.x 或更高版本"
    exit 1
fi

# 强制重置本地更改并更新代码
log "重置本地更改并更新代码..."
git reset --hard
git clean -fd
git pull

# 检查项目结构
log "检查项目结构..."
if [ ! -d "backend" ]; then
    error "backend 目录不存在"
    exit 1
fi

# 检查 PostgreSQL 服务
log "检查 PostgreSQL 服务..."
if ! systemctl is-active --quiet postgresql; then
    warn "PostgreSQL 服务未运行，尝试启动..."
    sudo systemctl start postgresql
fi

# 配置 PostgreSQL
log "配置 PostgreSQL..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE hazard_report;" || true

# 配置数据库和用户
log "配置数据库和用户..."
sudo -u postgres psql -d hazard_report -c "CREATE USER hazard_report WITH PASSWORD 'hazard_report';" || true
sudo -u postgres psql -d hazard_report -c "GRANT ALL PRIVILEGES ON DATABASE hazard_report TO hazard_report;"
sudo -u postgres psql -d hazard_report -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hazard_report;"
sudo -u postgres psql -d hazard_report -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hazard_report;"
sudo -u postgres psql -d hazard_report -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hazard_report;"
sudo -u postgres psql -d hazard_report -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hazard_report;"

# 配置数据库连接
log "配置数据库连接..."
cat > backend/.env << EOL
DATABASE_URL="postgresql://hazard_report:hazard_report@localhost:5432/hazard_report"
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:8080
UPLOAD_DIR=uploads
LOG_DIR=logs
MAX_FILE_SIZE=5242880
MAX_FILES=4
ALLOWED_TYPES=image/jpeg,image/png
EOL

# 检查端口占用
log "检查端口占用..."
if lsof -i :3000 > /dev/null; then
    warn "端口 3000 已被占用，尝试关闭..."
    sudo fuser -k 3000/tcp
fi

# 进入后端目录
cd backend

# 检查数据库
log "检查数据库..."
npx prisma generate

# 执行数据库迁移
log "执行数据库迁移..."
npx prisma migrate deploy

# 安装依赖
log "安装依赖..."
npm install

# 清理旧的构建文件
log "清理旧的构建文件..."
npm run clean || true

# 构建项目
log "构建项目..."
npm run build

# 启动服务
log "启动服务..."
pm2 restart hazard-report || pm2 start dist/app.js --name hazard-report

log "更新完成！"


