import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import reportsRouter from './routes/reports';
import ordersRouter from './routes/orders';
import authRouter from './routes/auth';
import { authMiddleware } from './routes/auth';
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

// 扩展 Request 类型以包含 csrfToken
declare global {
  namespace Express {
    interface Request {
      csrfToken: () => string;
    }
  }
}

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
const logDir = config.LOG.DIR;
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`创建日志目录: ${logDir}`);
} else {
    console.log(`日志目录已存在: ${logDir}`);
}

// 配置 CORS
app.use(cors({
    origin: config.SECURITY.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true
}));

// 解析 JSON 请求体
app.use(express.json());

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }));

// 配置 cookie 解析
app.use(cookieParser());

// 配置 CSRF 保护
const csrfProtection = csrf({ 
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
});

// CSRF Token 路由
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    if (req.csrfToken) {
        res.json({ token: req.csrfToken() });
    } else {
        res.status(500).json({ error: 'CSRF Token 生成失败' });
    }
});

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
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (config.UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('不支持的文件类型'));
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
console.log(`配置静态文件服务: /uploads -> ${uploadDir}`);

// 健康检查接口
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// 认证路由（不需要 CSRF 保护）
app.use('/api/auth', authRouter);

// API 路由（需要认证和 CSRF 保护）
app.use('/api/reports', authMiddleware, csrfProtection, reportsRouter);
app.use('/api/orders', authMiddleware, csrfProtection, ordersRouter);

// CSRF 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.code === 'EBADCSRFTOKEN') {
        res.status(403).json({
            success: false,
            error: '无效的 CSRF Token'
        });
    } else {
        next(err);
    }
});

// 错误处理中间件
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        error: '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
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
    console.log(`日志目录: ${config.LOG.DIR}`);
}); 