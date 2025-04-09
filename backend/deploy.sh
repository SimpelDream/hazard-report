#!/bin/bash

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}开始部署隐患报告系统...${NC}"

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用root权限运行此脚本${NC}"
    exit 1
fi

# 创建应用用户
echo -e "${YELLOW}创建应用用户...${NC}"
if ! id "nodejs" &>/dev/null; then
    useradd -m -s /bin/bash nodejs
    echo -e "${GREEN}已创建nodejs用户${NC}"
else
    echo -e "${YELLOW}nodejs用户已存在${NC}"
fi

# 安装必要的系统包
echo -e "${YELLOW}安装系统依赖...${NC}"
apt-get update
apt-get install -y curl git build-essential

# 安装 Node.js
echo -e "${YELLOW}安装 Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安装 PM2
echo -e "${YELLOW}安装 PM2...${NC}"
npm install -g pm2

# 设置文件描述符限制
echo -e "${YELLOW}配置系统限制...${NC}"
cat > /etc/security/limits.d/nodejs.conf << EOF
nodejs soft nofile 65535
nodejs hard nofile 65535
EOF

# 配置日志轮转
echo -e "${YELLOW}配置日志轮转...${NC}"
cat > /etc/logrotate.d/hazard-report << EOF
/var/log/hazard-report/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# 创建必要的目录
echo -e "${YELLOW}创建应用目录...${NC}"
APP_DIR="/var/www/hazard-report"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/uploads
chown -R nodejs:nodejs $APP_DIR
chmod -R 755 $APP_DIR

# 配置 Nginx
echo -e "${YELLOW}安装并配置 Nginx...${NC}"
apt-get install -y nginx
cat > /etc/nginx/sites-available/hazard-report << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /uploads {
        alias $APP_DIR/uploads;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
EOF

ln -sf /etc/nginx/sites-available/hazard-report /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 配置 PM2 启动脚本
echo -e "${YELLOW}配置 PM2...${NC}"
cat > $APP_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'hazard-report',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '$APP_DIR/logs/err.log',
    out_file: '$APP_DIR/logs/out.log',
    log_file: '$APP_DIR/logs/combined.log',
    time: true
  }]
}
EOF

# 设置环境变量
echo -e "${YELLOW}配置环境变量...${NC}"
cat > $APP_DIR/.env << EOF
DATABASE_URL="mysql://user:password@localhost:3306/hazard_report"
NODE_ENV="production"
PORT=3000
EOF

# 设置权限
chown -R nodejs:nodejs $APP_DIR
chmod 600 $APP_DIR/.env

echo -e "${GREEN}部署脚本执行完成！${NC}"
echo -e "${YELLOW}请确保：${NC}"
echo "1. 更新 .env 文件中的数据库连接信息"
echo "2. 将应用代码复制到 $APP_DIR 目录"
echo "3. 运行 'cd $APP_DIR && npm install' 安装依赖"
echo "4. 运行 'pm2 start ecosystem.config.js' 启动应用"
echo "5. 运行 'pm2 save' 保存 PM2 配置"
echo "6. 运行 'pm2 startup' 设置开机自启" 