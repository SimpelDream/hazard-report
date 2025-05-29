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
    console.log(`创建上传目录: ${uploadDir}`);
} else {
    console.log(`上传目录已存在: ${uploadDir}`);
}

// 静态文件服务
console.log(`配置静态文件服务: ${config.API.ROUTES.UPLOADS} -> ${uploadDir}`);
app.use(config.API.ROUTES.UPLOADS, express.static(uploadDir));

// Multer 配置：将上传文件存到 backend/uploads 目录
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      cb(null, uploadDir);
    } catch (error) {
      console.error('Multer目标目录错误:', error);
      cb(error, '');
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = uniqueSuffix + path.extname(file.originalname);
      console.log(`生成文件名: ${filename} (原文件: ${file.originalname})`);
      cb(null, filename);
    } catch (error) {
      console.error('Multer文件名生成错误:', error);
      cb(error, '');
    }
  }
});

// 这个配置仅供参考，实际使用的是routes/reports.ts中的配置
const upload = multer({ 
  storage,
  limits: {
    fileSize: config.UPLOAD.MAX_SIZE,
    files: 4
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = config.UPLOAD.ALLOWED_TYPES;
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
  }
});

// 记录Multer配置信息
console.log('Multer配置完成');
console.log(`- 最大文件大小: ${config.UPLOAD.MAX_SIZE / (1024*1024)}MB`);
console.log(`- 允许的文件类型: ${config.UPLOAD.ALLOWED_TYPES.join(', ')}`);

// API 路由
app.use(config.API.PREFIX + config.API.ROUTES.REPORTS, reportsRouter);
app.use(config.API.PREFIX + config.API.ROUTES.ORDERS, ordersRouter);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    
    // 确保Content-Type头设置为JSON
    res.setHeader('Content-Type', 'application/json');
    
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
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 处理
app.use((req, res) => {
    // 确保Content-Type头设置为JSON
    res.setHeader('Content-Type', 'application/json');
    
    // 记录请求信息以帮助调试
    console.warn(`404 - 未找到: ${req.method} ${req.originalUrl}`);
    
    res.status(404).json({
        success: false,
        error: '请求的资源不存在',
        path: req.originalUrl
    });
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});
