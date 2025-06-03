# 使用 Node.js 18 作为基础镜像
FROM node:18-slim

# 设置工作目录
WORKDIR /app

# 安装 OpenSSL 和 PM2
RUN apt-get update -y && apt-get install -y openssl
RUN npm install -g pm2

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 创建上传和日志目录
RUN mkdir -p uploads logs

# 复制源代码
COPY . .

# 删除所有 .js 文件（除了 node_modules 和 dist 目录中的文件）
RUN find . -name "*.js" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -name "ecosystem.config.js" -delete

# 生成 Prisma 客户端
RUN npx prisma generate

# 编译 TypeScript
RUN npm run build

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["pm2-runtime", "ecosystem.config.js", "--no-daemon"] 