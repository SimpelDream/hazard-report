# 隐患上报平台

## 项目简介
这是一个基于 Web 的隐患上报平台，用于中铁电气化局集团第三工程有限公司通信分公司内部使用。用户可以提交安全隐患报告，包括文字描述和图片上传功能。

## 技术栈
- 前端：HTML5, TailwindCSS
- 后端：Node.js, Express
- 数据库：PostgreSQL
- ORM：Prisma

## 功能特点
- 响应式设计，支持移动端访问
- 暗色模式支持
- 图片上传预览
- 表单验证
- 实时字数统计
- 多项目选择

## 安装部署
1. 克隆项目
```bash
git clone [repository-url]
cd hazard-report
```

2. 安装依赖
```bash
# 后端依赖
cd backend
npm install

# 前端依赖（如果需要）
cd ../frontend
npm install
```

3. 配置环境变量
复制 `.env.example` 到 `.env` 并修改配置：
```bash
cp .env.example .env
```

4. 初始化数据库
```bash
cd backend
npx prisma migrate dev
```

5. 启动服务
```bash
# 开发环境
npm run dev

# 生产环境
npm run start
```

## 目录结构
```
hazard-report/
├── frontend/          # 前端代码
│   ├── index.html    # 主页面
│   └── images/       # 图片资源
├── backend/          # 后端代码
│   ├── src/         # 源代码
│   ├── prisma/      # 数据库模型
│   └── uploads/     # 上传文件存储
└── README.md        # 项目文档
```

## 使用说明
1. 访问系统首页
2. 填写隐患报告表单
3. 上传相关图片（可选）
4. 提交报告

## 注意事项
- 图片上传限制为最多4张
- 描述文字限制为500字
- 所有带*的字段为必填项

## 维护说明
- 定期检查日志文件
- 监控数据库大小
- 清理过期的上传文件

## 许可证
[许可证类型] 