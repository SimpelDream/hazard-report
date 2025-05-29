const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const config = require('./src/config');
const reportsRouter = require('./src/routes/reports');
const ordersRouter = require('./src/routes/orders');

const app = express();

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

// 静态文件服务
app.use(config.API.ROUTES.UPLOADS, express.static(path.join(__dirname, config.UPLOAD.DIR)));

// API 路由
app.use(config.API.PREFIX + config.API.ROUTES.REPORTS, reportsRouter);
app.use(config.API.PREFIX + config.API.ROUTES.ORDERS, ordersRouter);

// 启动服务器
app.listen(config.SERVER.PORT, config.SERVER.HOST, () => {
    console.log(`服务器运行在 http://${config.SERVER.HOST}:${config.SERVER.PORT}`);
});
