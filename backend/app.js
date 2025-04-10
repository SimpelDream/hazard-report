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

// 添加制度文件服务 - 读取orders目录下的文件
const ordersDir = path.join(__dirname, 'orders');
if (!fs.existsSync(ordersDir)) {
	fs.mkdirSync(ordersDir, { recursive: true, mode: 0o755 });
}
app.use('/api/orders', express.static(ordersDir));

// 获取制度文件列表API
app.get('/api/orders', async (req, res) => {
	try {
		const files = fs.readdirSync(ordersDir)
			.filter(file => !file.startsWith('.')) // 过滤隐藏文件
			.map(file => {
				const filePath = path.join(ordersDir, file);
				const stats = fs.statSync(filePath);
				return {
					name: file,
					size: stats.size,
					lastModified: stats.mtime
				};
			});
		
		res.json(files);
	} catch (error) {
		logger.error('获取制度文件列表失败:', error);
		res.status(500).json({ error: "获取制度文件列表失败" });
	}
});

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

// 更新报告状态API
app.patch('/api/reports/:id/status', async (req, res) => {
	try {
		const { id } = req.params;
		const { status } = req.body;
		
		if (!status || !['进行中', '已整改'].includes(status)) {
			return res.status(400).json({ error: "状态值无效，必须是'进行中'或'已整改'" });
		}
		
		const report = await prisma.report.update({
			where: { id: parseInt(id) },
			data: { 
				status,
				statusUpdatedAt: new Date()
			}
		});
		
		logger.info('报告状态更新成功', { reportId: id, status });
		res.json(report);
	} catch (error) {
		logger.error('更新报告状态失败:', error);
		res.status(500).json({ error: "更新报告状态失败" });
	}
});

// 导出报告数据为Excel文件
app.get('/api/reports/export', async (req, res) => {
	try {
		const Excel = require('exceljs');
		const { project, category, reporter, fromDate, toDate } = req.query;
		
		// 构建查询条件
		const whereClause = {
			...(project && { project }),
			...(category && { category }),
			...(reporter && { reporter }),
			...(fromDate && toDate && {
				foundAt: {
					gte: new Date(fromDate),
					lte: new Date(toDate)
				}
			})
		};
		
		// 获取所有符合条件的报告
		const reports = await prisma.report.findMany({
			where: whereClause,
			orderBy: { createdAt: 'desc' }
		});
		
		// 创建工作簿和工作表
		const workbook = new Excel.Workbook();
		workbook.creator = '隐患上报平台';
		workbook.created = new Date();
		
		const worksheet = workbook.addWorksheet('隐患报告', {
			properties: { tabColor: { argb: '4F81BD' } }
		});
		
		// 设置列定义
		worksheet.columns = [
			{ header: 'ID', key: 'id', width: 10 },
			{ header: '项目', key: 'project', width: 30 },
			{ header: '上报人', key: 'reporter', width: 15 },
			{ header: '联系电话', key: 'phone', width: 15 },
			{ header: '隐患类别', key: 'category', width: 15 },
			{ header: '发现时间', key: 'foundAt', width: 20 },
			{ header: '地点', key: 'location', width: 30 },
			{ header: '描述', key: 'description', width: 40 },
			{ header: '图片数量', key: 'imageCount', width: 10 },
			{ header: '状态', key: 'status', width: 10 },
			{ header: '状态更新时间', key: 'statusUpdatedAt', width: 20 },
			{ header: '创建时间', key: 'createdAt', width: 20 }
		];
		
		// 设置表头样式
		worksheet.getRow(1).font = { bold: true, size: 12 };
		worksheet.getRow(1).fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'E6F2FF' }
		};
		
		// 添加数据
		reports.forEach(report => {
			worksheet.addRow({
				id: report.id,
				project: report.project,
				reporter: report.reporter,
				phone: report.phone,
				category: report.category || '未分类',
				foundAt: report.foundAt,
				location: report.location,
				description: report.description,
				imageCount: report.images ? report.images.length : 0,
				status: report.status || '进行中',
				statusUpdatedAt: report.statusUpdatedAt,
				createdAt: report.createdAt
			});
		});
		
		// 格式化日期列
		worksheet.eachRow((row, rowNumber) => {
			if (rowNumber > 1) {
				// 日期格式化
				if (row.getCell('foundAt').value) {
					row.getCell('foundAt').numFmt = 'yyyy-mm-dd hh:mm:ss';
				}
				if (row.getCell('statusUpdatedAt').value) {
					row.getCell('statusUpdatedAt').numFmt = 'yyyy-mm-dd hh:mm:ss';
				}
				if (row.getCell('createdAt').value) {
					row.getCell('createdAt').numFmt = 'yyyy-mm-dd hh:mm:ss';
				}
				
				// 根据状态设置颜色
				if (row.getCell('status').value === '已整改') {
					row.getCell('status').fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: { argb: 'E2EFDA' } // 浅绿色
					};
				} else if (row.getCell('status').value === '进行中') {
					row.getCell('status').fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: { argb: 'FFFBCC' } // 浅黄色
					};
				}
			}
		});
		
		// 生成文件名
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `隐患报告导出_${timestamp}.xlsx`;
		
		// 设置响应头
		res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
		
		// 将工作簿写入响应
		await workbook.xlsx.write(res);
		res.end();
		
		logger.info('报告数据成功导出为Excel', { filters: whereClause, count: reports.length });
	} catch (error) {
		logger.error('导出报告数据失败:', error);
		res.status(500).json({ error: "导出报告数据失败" });
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

// 添加全局错误处理
process.on('uncaughtException', (err) => {
	console.error('未捕获的异常:', err);
	logger.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (err) => {
	console.error('未处理的Promise拒绝:', err);
	logger.error('未处理的Promise拒绝:', err);
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

// 数据库连接并启动服务器
prisma.$connect()
	.then(() => {
		console.log('数据库连接成功');
		logger.info('数据库连接成功');
		
		// 启动服务器
		const port = process.env.PORT || 3000;
		const server = app.listen(port, '0.0.0.0', () => {
			console.log(`服务器启动在端口 ${port}`);
			logger.info(`服务器启动在端口 ${port}`);
		});

		// 设置超时
//		server.timeout = 30000; // 30秒
//		server.keepAliveTimeout = 65000; // 65秒
	})
	.catch((error) => {
		console.error('数据库连接失败:', error);
		logger.error('数据库连接失败:', error);
		process.exit(1);
	});

