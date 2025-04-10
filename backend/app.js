// app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const multer = require('multer');
const sharp = require('sharp');

// 初始化日志
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
	fs.mkdirSync(logDir, { recursive: true, mode: 0o755 });
}

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json()
	),
	transports: [
		new winston.transports.File({ 
			filename: path.join(logDir, 'error.log'), 
			level: 'error',
			maxsize: 5242880, // 5MB
			maxFiles: 5
		}),
		new winston.transports.File({ 
			filename: path.join(logDir, 'combined.log'),
			maxsize: 5242880, // 5MB
			maxFiles: 5
		})
	]
});

if (process.env.NODE_ENV !== 'production') {
	logger.add(new winston.transports.Console({
		format: winston.format.simple()
	}));
}

const prisma = new PrismaClient();
const app = express();

// 创建必要的目录
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}

// 配置multer存储
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		cb(null, uniqueSuffix + path.extname(file.originalname));
	}
});

const upload = multer({
	storage,
	limits: {
		fileSize: 2 * 1024 * 1024 // 2MB
	},
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith('image/')) {
			cb(null, true);
		} else {
			cb(new Error('只允许上传图片文件'));
		}
	}
});

// 增加请求体大小限制
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 配置CORS
app.use(cors({
	origin: ['http://8.148.69.112', 'http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://8.148.69.112:3000', 'http://8.148.69.112:80'],
	methods: ['GET', 'POST', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Accept'],
	maxAge: 86400,
	credentials: true
}));

// 请求限制
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	message: { error: '请求过于频繁，请稍后再试' }
});
app.use('/api/', limiter);

// 验证请求参数
function validateReportData(data) {
	const errors = [];
	
	// 必填字段验证
	const requiredFields = ['project', 'reporter', 'phone', 'foundAt', 'location', 'description'];
	for (const field of requiredFields) {
		if (!data[field]) {
			errors.push(`${field} 是必填字段`);
		}
	}

	// 电话号码格式验证
	const phoneRegex = /^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/;
	if (data.phone && !phoneRegex.test(data.phone)) {
		errors.push('电话号码格式不正确');
	}

	// 日期格式验证
	if (data.foundAt) {
		const date = new Date(data.foundAt);
		if (isNaN(date.getTime())) {
			errors.push('日期格式不正确');
		} else if (date > new Date()) {
			errors.push('隐患发现时间不能晚于当前时间');
		}
	}

	return errors;
}

// 图片处理中间件
async function processImages(req, res, next) {
	if (!req.files || req.files.length === 0) return next();

	try {
		for (const file of req.files) {
			const image = sharp(file.path);
			const metadata = await image.metadata();
			
			// 调整图片大小
			if (metadata.width > 1200) {
				await image.resize(1200, null, { withoutEnlargement: true });
			}
			
			// 压缩图片质量
			await image.jpeg({ quality: 80 }).toFile(file.path + '.jpg');
			
			// 删除原始文件
			fs.unlinkSync(file.path);
			
			file.path = file.path + '.jpg';
		}
		next();
	} catch (error) {
		logger.error('图片处理失败:', error);
		next(error);
	}
}

// 静态文件服务
app.use('/uploads', express.static(uploadDir));

// 上报隐患记录API
app.post('/api/reports', upload.array('images', 4), processImages, async (req, res) => {
	try {
		const errors = validateReportData(req.body);
		if (errors.length > 0) {
			return res.status(400).json({ error: errors.join(',') });
		}

		const { project, reporter, phone, category, foundAt, location, description } = req.body;
		const images = req.files ? req.files.map(file => `/uploads/${path.basename(file.path)}`) : [];

		const report = await prisma.report.create({
			data: { 
				project, 
				reporter, 
				phone, 
				category, 
				foundAt: new Date(foundAt), 
				location, 
				description,
				images
			}
		});

		logger.info('新报告创建成功', { reportId: report.id });
		res.json(report);
	} catch (error) {
		logger.error('创建报告失败:', error);
		res.status(500).json({ error: "服务器内部错误" });
	}
});

// 查询记录API
app.get('/api/reports', async (req, res) => {
	try {
		const { project, category, reporter, fromDate, toDate, page = 1, limit = 10 } = req.query;
		
		// 验证日期格式
		if (fromDate && toDate) {
			const from = new Date(fromDate);
			const to = new Date(toDate);
			if (isNaN(from.getTime()) || isNaN(to.getTime())) {
				return res.status(400).json({ error: '日期格式不正确' });
			}
		}

		const skip = (parseInt(page) - 1) * parseInt(limit);
		
		const [reports, total] = await Promise.all([
			prisma.report.findMany({
				where: {
					...(project && { project }),
					...(category && { category }),
					...(reporter && { reporter }),
					...(fromDate && toDate && {
						foundAt: {
							gte: new Date(fromDate),
							lte: new Date(toDate)
						}
					})
				},
				orderBy: { createdAt: 'desc' },
				skip,
				take: parseInt(limit)
			}),
			prisma.report.count({
				where: {
					...(project && { project }),
					...(category && { category }),
					...(reporter && { reporter }),
					...(fromDate && toDate && {
						foundAt: {
							gte: new Date(fromDate),
							lte: new Date(toDate)
						}
					})
				}
			})
		]);
		
		const reportsWithImages = reports.map(report => ({
			...report,
			images: report.images || []
		}));
		
		res.json({
			data: reportsWithImages,
			pagination: {
				total,
				page: parseInt(page),
				limit: parseInt(limit),
				pages: Math.ceil(total / parseInt(limit))
			}
		});
	} catch (error) {
		logger.error('查询报告失败:', error);
		res.status(500).json({ error: "服务器内部错误" });
	}
});

// 错误处理中间件
app.use((err, req, res, next) => {
	logger.error('服务器错误:', err);
	
	// 确保错误响应始终是JSON格式
	res.status(err.status || 500).json({
		error: err.message || '服务器内部错误',
		status: err.status || 500
	});
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
	logger.error('未捕获的异常:', err);
	process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
	logger.error('未处理的Promise拒绝:', reason);
});

// 优雅关闭
process.on('SIGTERM', () => {
	logger.info('收到 SIGTERM 信号，准备关闭服务器...');
	prisma.$disconnect()
		.then(() => {
			logger.info('数据库连接已关闭');
			process.exit(0);
		})
		.catch(err => {
			logger.error('关闭数据库连接时出错:', err);
			process.exit(1);
		});
});

// 数据库连接
prisma.$connect()
	.then(() => {
		logger.info('数据库连接成功');
	})
	.catch((error) => {
		logger.error('数据库连接失败:', error);
		process.exit(1);
	});

// 启动服务器
const port = process.env.PORT || 3000;
app.listen(port, () => {
	logger.info(`服务器启动在端口 ${port}`);
	console.log(`服务器启动在端口 ${port}`);
});

// 设置超时
server.timeout = 30000; // 30秒
server.keepAliveTimeout = 65000; // 65秒

