"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config");
const reports_1 = __importDefault(require("./routes/reports"));
const orders_1 = __importDefault(require("./routes/orders"));
const app = (0, express_1.default)();
// 确保上传目录存在
const uploadDir = config_1.config.UPLOAD.DIR;
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
    console.log(`创建上传目录: ${uploadDir}`);
}
else {
    console.log(`上传目录已存在: ${uploadDir}`);
}
// 确保日志目录存在
const logDir = config_1.config.LOG.DIR;
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
    console.log(`创建日志目录: ${logDir}`);
}
else {
    console.log(`日志目录已存在: ${logDir}`);
}
// 配置 CORS
app.use((0, cors_1.default)({
    origin: config_1.config.SECURITY.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
// 解析 JSON 请求体
app.use(express_1.default.json());
// 解析 URL 编码的请求体
app.use(express_1.default.urlencoded({ extended: true }));
// 配置 multer 存储
const storage = multer_1.default.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
// 文件过滤器
const fileFilter = (_req, file, cb) => {
    if (config_1.config.UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('不支持的文件类型'));
    }
};
// 创建 multer 实例
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: config_1.config.UPLOAD.MAX_SIZE,
        files: config_1.config.UPLOAD.MAX_FILES
    }
});
// 配置静态文件服务
app.use('/uploads', express_1.default.static(uploadDir));
console.log(`配置静态文件服务: /uploads -> ${uploadDir}`);
// 健康检查接口
app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
// API 路由
app.use('/api/reports', reports_1.default);
app.use('/api/orders', orders_1.default);
// 错误处理中间件
app.use((err, _req, res, _next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        error: '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
// 启动服务器
const PORT = config_1.config.SERVER.PORT;
const HOST = config_1.config.SERVER.HOST;
app.listen(PORT, HOST, () => {
    console.log(`API 服务器运行在 http://${HOST}:${PORT}`);
    console.log(`环境: ${config_1.config.SERVER.NODE_ENV}`);
    console.log(`CORS 来源: ${config_1.config.SECURITY.CORS_ORIGIN}`);
    console.log(`上传目录: ${config_1.config.UPLOAD.DIR}`);
    console.log(`日志目录: ${config_1.config.LOG.DIR}`);
});
