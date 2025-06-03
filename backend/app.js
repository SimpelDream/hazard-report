const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const config = require('./src/config');

const app = express();
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: config.DATABASE_URL
        }
    }
});

// 将 prisma 实例添加到 app.locals
app.locals.prisma = prisma;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 确保必要的目录存在
const uploadDir = path.resolve(config.UPLOAD_DIR);
const logDir = path.resolve(config.LOG_DIR);
const exportDir = path.resolve(config.EXPORT_DIR);

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('创建上传目录:', uploadDir);
} else {
    console.log('上传目录已存在:', uploadDir);
}

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log('创建日志目录:', logDir);
}

if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
    console.log('创建导出目录:', exportDir);
}

// 路由
app.use(config.API_PREFIX + config.ROUTES.REPORTS, require('./src/routes/reports'));
app.use(config.API_PREFIX + config.ROUTES.ORDERS, require('./src/routes/orders'));
app.use(config.API_PREFIX + config.ROUTES.AUTH, require('./src/routes/auth'));

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
const PORT = config.PORT;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

// 优雅关闭
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});