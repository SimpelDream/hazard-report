const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cors());

// 上报隐患记录API
app.post('/api/reports', async (req, res) => {
	const { project, reporter, phone, category, foundAt, location, description } = req.body;
	try {
	const report = await prisma.report.create({
		data: { project, reporter, phone, category, foundAt: new Date(foundAt), location, description }
	});
	res.json(report);
	 } catch (error) {
	console.error(error);
	res.status(500).json({ error: "内部错误" });
	}
});

// 查询记录API（简单查询）
app.get('/api/reports', async (req, res) => {
	const reports = await prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
	res.json(reports);
});

// 启动服务
app.listen(3000, () => {
	console.log('后端服务已启动：http://localhost:3000');
});