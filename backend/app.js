const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const config = require('./src/config');
const reportsRouter = require('./dist/routes/reports');
const ordersRouter = require('./dist/routes/orders');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

// 启用 CORS
app.use(cors({
    origin: config.SECURITY.CORS_ORIGIN
}));

// 解析 JSON 请求体
app.use(express.json());

// 确保上传目录存在
const uploadDir = path.join(__dirname, config.UPLOAD.DIR);
if (!require('fs').existsSync(uploadDir)) {
    require('fs').mkdirSync(uploadDir, { recursive: true });
}

// 静态文件服务
app.use(config.API.ROUTES.UPLOADS, express.static(path.join(__dirname, config.UPLOAD.DIR)));

// Multer 配置：将上传文件存到 backend/uploads 目录
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// API 路由
app.use(config.API.PREFIX + config.API.ROUTES.REPORTS, reportsRouter);
app.use(config.API.PREFIX + config.API.ROUTES.ORDERS, ordersRouter);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    
    // 检查是否是 Multer 错误
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false,
                error: '文件大小超过限制' 
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                success: false,
                error: '上传的文件数量超过限制' 
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ 
                success: false,
                error: '意外的字段名称，请确保表单字段名称正确' 
            });
        }
        return res.status(400).json({ 
            success: false,
            error: `上传文件错误: ${err.message}` 
        });
    }
    
    // 其他一般错误
    res.status(500).json({
        success: false,
        error: '服务器内部错误'
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '请求的资源不存在'
    });
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});
