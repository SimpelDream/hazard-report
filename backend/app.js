const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('./src/config');
const reportsRouter = require('./src/routes/reports');
const ordersRouter = require('./src/routes/orders');
const adminRouter = require('./src/routes/admin');

const app = express();

// 确保上传目录存在
const uploadDir = config.UPLOAD.DIR;
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`创建上传目录: ${uploadDir}`);
} else {
    console.log(`上传目录已存在: ${uploadDir}`);
}

// 确保日志目录存在
const logDir = config.LOGGING.DIR;
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`创建日志目录: ${logDir}`);
} else {
    console.log(`日志目录已存在: ${logDir}`);
}

// 配置 CORS
app.use(cors({
    origin: config.SECURITY.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// 解析 JSON 请求体
app.use(express.json());

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }));

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    if (config.UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('不支持的文件类型'), false);
    }
};

// 创建 multer 实例
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: config.UPLOAD.MAX_SIZE,
        files: config.UPLOAD.MAX_FILES
    }
});

// 配置静态文件服务
app.use('/uploads', express.static(uploadDir));
app.use('/api/uploads', express.static(uploadDir));
console.log(`配置静态文件服务: /uploads -> ${uploadDir}`);

// API 路由
app.use('/api/reports', reportsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);

// 健康检查接口
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        error: '服务器内部错误'
    });
});

// 启动服务器
const PORT = config.SERVER.PORT;
const HOST = config.SERVER.HOST;
app.listen(PORT, HOST, () => {
    console.log(`API 服务器运行在 http://${HOST}:${PORT}`);
    console.log(`环境: ${config.SERVER.NODE_ENV}`);
    console.log(`CORS 来源: ${config.SECURITY.CORS_ORIGIN}`);
    console.log(`上传目录: ${config.UPLOAD.DIR}`);
    console.log(`日志目录: ${config.LOGGING.DIR}`);
});
