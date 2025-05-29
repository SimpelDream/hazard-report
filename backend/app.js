const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const config = require('./src/config');
const reportsRouter = require('./dist/routes/reports');
const ordersRouter = require('./dist/routes/orders');

const app = express();
const port = process.env.PORT || 3000;

// 启用 CORS
app.use(cors({
    origin: config.SECURITY.CORS_ORIGIN
}));

// 解析 JSON 请求体
app.use(express.json());

// 文件上传中间件
app.use(fileUpload({
    limits: { fileSize: config.UPLOAD.MAX_SIZE },
    createParentPath: true
}));

// 确保上传目录存在
const uploadDir = path.join(__dirname, config.UPLOAD.DIR);
if (!require('fs').existsSync(uploadDir)) {
    require('fs').mkdirSync(uploadDir, { recursive: true });
}

// 静态文件服务
app.use(config.API.ROUTES.UPLOADS, express.static(path.join(__dirname, config.UPLOAD.DIR)));

// API 路由
app.use(config.API.PREFIX + config.API.ROUTES.REPORTS, reportsRouter);
app.use(config.API.PREFIX + config.API.ROUTES.ORDERS, ordersRouter);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
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
