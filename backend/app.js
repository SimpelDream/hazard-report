const express = require('express');
const cors = require('cors');
const path = require('path');
const reportsRouter = require('./src/routes/reports');

const app = express();
const port = process.env.PORT || 3000;

// 启用 CORS
app.use(cors());

// 解析 JSON 请求体
app.use(express.json());

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API 路由
app.use('/api/reports', reportsRouter);

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
