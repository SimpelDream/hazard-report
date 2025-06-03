# 隐患上报系统 - Docker 容器化部署指南

本文档提供了隐患上报系统的 Docker 容器化部署指南，包括本地开发环境和生产环境的部署流程。

## 前提条件

- 安装 Docker Desktop (Windows/Mac) 或 Docker Engine (Linux)
- Git 用于代码版本控制
- 互联网连接用于拉取基础镜像

## 项目结构

```
hazard-report/
├── backend/                 # 后端 Node.js 代码
│   ├── Dockerfile           # 后端容器构建文件
│   ├── app.js               # 主程序入口
│   ├── ecosystem.config.js  # PM2 配置文件
│   ├── package.json         # 依赖管理
│   └── prisma/              # Prisma ORM 配置和数据库
├── frontend/                # 前端静态文件
├── nginx.conf               # Nginx 配置
├── docker-compose.yml       # 容器编排配置
├── .env.example             # 环境变量示例
├── build-and-run.bat        # Windows 构建和运行脚本
├── debug.bat                # Windows 调试脚本
├── test-api.bat             # Windows API 测试脚本
├── publish.sh               # 发布镜像脚本
└── deploy.sh                # 部署脚本
```

## 本地开发环境部署

### Windows 用户

1. 确保 Docker Desktop 已安装并运行
2. 双击 `build-and-run.bat` 脚本自动构建和运行容器
3. 使用 `debug.bat` 查看日志和进入容器
4. 使用 `test-api.bat` 测试 API 接口
5. 使用 `cleanup.bat` 清理容器和镜像

### Linux/Mac 用户

```bash
# 构建镜像
docker compose build

# 启动容器
docker compose up -d

# 查看日志
docker compose logs

# 测试 API
curl -i http://localhost/health
curl -i http://localhost/api/reports
```

## 生产环境部署

1. 设置镜像仓库
   ```bash
   # 编辑 publish.sh 和 deploy.sh 中的 REGISTRY 变量
   vi publish.sh
   vi deploy.sh
   ```

2. 构建并推送镜像
   ```bash
   ./publish.sh
   ```

3. 在服务器上部署
   ```bash
   ./deploy.sh
   ```

## 容器化配置说明

### docker-compose.yml

- `backend` 服务：后端 Node.js 应用，端口 3000
- `nginx` 服务：前端静态文件和反向代理，端口 80
- 挂载卷：
  - `./backend/prisma:/app/prisma` - 保存 SQLite 数据库
  - `./backend/uploads:/app/uploads` - 保存上传的文件
  - `./nginx.conf:/etc/nginx/nginx.conf` - Nginx 配置
  - `./frontend:/usr/share/nginx/html` - 前端静态文件

### 环境变量

- `NODE_ENV=production` - 生产环境模式
- `HOST=0.0.0.0` - 绑定所有网络接口
- `PORT=3000` - 后端服务端口
- `DATABASE_URL=file:./prisma/dev.db` - SQLite 数据库路径

## 常见问题排查

### 构建问题

- **依赖安装失败**：检查网络连接，或者尝试使用非 Alpine 镜像
- **缺少系统库**：在 Dockerfile 中添加 `RUN apt-get update && apt-get install -y ...`

### 运行问题

- **容器无法启动**：检查日志 `docker compose logs`
- **API 无法访问**：检查 Nginx 配置和网络连接
- **数据库连接错误**：确认 DATABASE_URL 环境变量和挂载卷配置正确

### 性能优化

- 使用 `pm2` 多进程模式提高性能
- Nginx 缓存静态资源
- 定期备份 SQLite 数据库

## 回滚策略

如果部署失败，`deploy.sh` 脚本会自动回滚到上一个成功的版本。 