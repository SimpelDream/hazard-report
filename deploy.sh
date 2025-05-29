#!/bin/bash

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 设置日志文件
LOGFILE="deploy.log"
echo "===== 部署开始 $(date) =====" > $LOGFILE

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
for cmd in node npm git nginx pm2; do
    if ! check_command $cmd; then
        error "请先安装 $cmd"
        exit 1
    fi
done

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.18.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    warn "Node.js 版本过低，当前版本: $NODE_VERSION，需要版本 >= $REQUIRED_VERSION"
    log "正在安装新版本的 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 创建项目目录
PROJECT_DIR="/var/www/hazard-report"
log "创建项目目录: $PROJECT_DIR"
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# 克隆代码
if [ ! -d "$PROJECT_DIR/.git" ]; then
    log "克隆代码仓库..."
    git clone <repository_url> $PROJECT_DIR
else
    log "更新代码..."
    cd $PROJECT_DIR
    git pull
fi

# 安装后端依赖
log "安装后端依赖..."
cd $PROJECT_DIR/backend
npm install

# 创建必要的目录
log "创建必要的目录..."
mkdir -p uploads logs orders
chmod 755 uploads logs orders

# 编译 TypeScript
log "编译 TypeScript..."
npm run build

# 生成 Prisma 客户端
log "生成 Prisma 客户端..."
npx prisma generate

# 执行数据库迁移
log "执行数据库迁移..."
npx prisma migrate deploy

# 配置 Nginx
log "配置 Nginx..."
sudo tee /etc/nginx/sites-available/hazard-report > /dev/null << 'EOF'
server {
    listen 80;
    server_name 8.148.69.112;

    # 前端静态文件
    location / {
        root /var/www/hazard-report/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件访问
    location /uploads {
        alias /var/www/hazard-report/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
EOF

# 启用 Nginx 配置
log "启用 Nginx 配置..."
sudo ln -sf /etc/nginx/sites-available/hazard-report /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 启动后端服务
log "启动后端服务..."
pm2 restart hazard-report-api || pm2 start ecosystem.config.js

# 检查服务状态
log "检查服务状态..."
if pm2 list | grep -q "hazard-report-api"; then
    log "后端服务已启动"
else
    error "后端服务启动失败"
    exit 1
fi

if systemctl is-active --quiet nginx; then
    log "Nginx 服务已启动"
else
    error "Nginx 服务启动失败"
    exit 1
fi

# 输出部署完成信息
log "部署完成！"
log "前端访问地址: http://8.148.69.112"
log "API 地址: http://8.148.69.112/api"
log "详细日志请查看: $LOGFILE"

# 显示服务状态
echo -e "\n${YELLOW}服务状态:${NC}"
pm2 list
echo -e "\n${YELLOW}Nginx 状态:${NC}"
systemctl status nginx | grep Active 