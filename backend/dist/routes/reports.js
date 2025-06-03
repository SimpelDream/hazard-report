"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../config");
const exceljs_1 = __importDefault(require("exceljs"));
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// 导出任务存储
const exportTasks = new Map();
// 创建导出任务
function createExportTask(format) {
    const taskId = (0, uuid_1.v4)();
    const task = {
        id: taskId,
        status: 'pending',
        progress: 0,
        total: 0,
        format,
        filename: `reports_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`,
        createdAt: new Date()
    };
    exportTasks.set(taskId, task);
    return task;
}
// 更新导出任务状态
function updateExportTask(taskId, updates) {
    const task = exportTasks.get(taskId);
    if (task) {
        Object.assign(task, updates);
        if (updates.status === 'completed' || updates.status === 'failed') {
            task.completedAt = new Date();
        }
    }
}
// 清理过期任务（24小时）
function cleanupExportTasks() {
    const now = new Date();
    for (const [taskId, task] of exportTasks.entries()) {
        if (now.getTime() - task.createdAt.getTime() > 24 * 60 * 60 * 1000) {
            exportTasks.delete(taskId);
        }
    }
}
// 定期清理过期任务
setInterval(cleanupExportTasks, 60 * 60 * 1000);
// 配置文件上传
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, config_1.config.UPLOAD.DIR);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: config_1.config.UPLOAD.MAX_SIZE,
        files: config_1.config.UPLOAD.MAX_FILES
    },
    fileFilter: (_req, file, cb) => {
        if (config_1.config.UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('不支持的文件类型'));
        }
    }
});
// 错误处理中间件
const errorHandler = (err, _req, res, _next) => {
    console.error('文件上传错误:', err);
    return res.status(400).json({
        success: false,
        error: err.message
    });
};
// 获取状态更新日志
async function getStatusUpdateLogs(reportId) {
    const logFile = path_1.default.join(config_1.config.LOG.DIR, 'status-updates', `${reportId}.log`);
    if (!fs_1.default.existsSync(logFile)) {
        return [];
    }
    const logContent = fs_1.default.readFileSync(logFile, 'utf-8');
    return logContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
}
// 创建报告
router.post('/', (req, res, next) => {
    // 使用try-catch包装multer中间件
    try {
        upload.array('images', config_1.config.UPLOAD.MAX_FILES)(req, res, async (err) => {
            if (err) {
                // 如果multer处理过程中出错，直接传递给错误处理中间件
                return next(err);
            }
            try {
                const { project, reporter, phone, category, foundAt, location, description } = req.body;
                // 验证必填字段
                if (!project || !reporter || !phone || !foundAt || !location || !description) {
                    return res.status(400).json({
                        success: false,
                        error: '请填写所有必填字段'
                    });
                }
                // 验证文件上传
                if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: '请至少上传一张图片'
                    });
                }
                const files = req.files;
                // 处理图片路径
                const imagePaths = files.map(file => `${config_1.config.API.ROUTES.UPLOADS}/${file.filename}`).join(',');
                const report = await prisma.report.create({
                    data: {
                        project,
                        reporter,
                        phone,
                        category,
                        foundAt: new Date(foundAt),
                        location,
                        description,
                        images: imagePaths
                    },
                });
                res.status(201).json({
                    success: true,
                    data: report
                });
            }
            catch (error) {
                console.error('创建报告失败:', error);
                next(error);
            }
        });
    }
    catch (error) {
        console.error('Multer处理失败:', error);
        next(error);
    }
});
// 获取报告列表（分页）
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        // 构建查询条件
        const where = {};
        if (req.query.project) {
            where.project = req.query.project;
        }
        if (req.query.status) {
            where.status = req.query.status;
        }
        if (req.query.startDate && req.query.endDate) {
            where.foundAt = {
                gte: new Date(req.query.startDate),
                lte: new Date(req.query.endDate)
            };
        }
        // 获取总数
        const total = await prisma.report.count({ where });
        // 获取数据
        const reports = await prisma.report.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: {
                reports,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    }
    catch (error) {
        console.error('获取报告列表失败:', error);
        next(error);
    }
});
// 获取单个报告
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const report = await prisma.report.findUnique({
            where: { id: parseInt(id) }
        });
        if (!report) {
            return res.status(404).json({
                success: false,
                error: '报告不存在'
            });
        }
        return res.json({
            success: true,
            data: report
        });
    }
    catch (error) {
        return next(error);
    }
});
// 更新报告状态
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const report = await prisma.report.update({
            where: { id: parseInt(id) },
            data: { status }
        });
        return res.json({
            success: true,
            data: report
        });
    }
    catch (error) {
        console.error('更新状态错误:', error);
        return res.status(500).json({
            success: false,
            error: '服务器内部错误'
        });
    }
});
// 获取状态更新历史
router.get('/:id/status-history', async (req, res) => {
    const { id } = req.params;
    try {
        const logs = await getStatusUpdateLogs(parseInt(id));
        res.json({
            success: true,
            data: logs
        });
    }
    catch (error) {
        console.error('获取状态更新历史失败:', error);
        res.status(500).json({
            success: false,
            error: '获取状态更新历史失败'
        });
    }
});
// 导出报告
router.get('/export', async (req, res, next) => {
    const format = req.query.format || 'excel';
    const task = createExportTask(format);
    try {
        // 构建查询条件
        const where = {};
        if (req.query.project) {
            where.project = req.query.project;
        }
        if (req.query.status) {
            where.status = req.query.status;
        }
        if (req.query.startDate && req.query.endDate) {
            where.foundAt = {
                gte: new Date(req.query.startDate),
                lte: new Date(req.query.endDate)
            };
        }
        // 获取总数
        const total = await prisma.report.count({ where });
        updateExportTask(task.id, { total, status: 'processing' });
        // 分批获取数据
        const batchSize = 1000;
        const batches = Math.ceil(total / batchSize);
        const reports = [];
        for (let i = 0; i < batches; i++) {
            const batch = await prisma.report.findMany({
                where,
                skip: i * batchSize,
                take: batchSize,
                orderBy: { createdAt: 'desc' }
            });
            reports.push(...batch);
            updateExportTask(task.id, { progress: reports.length });
        }
        // 创建导出目录
        const exportDir = path_1.default.join(config_1.config.UPLOAD.DIR, 'exports');
        if (!fs_1.default.existsSync(exportDir)) {
            fs_1.default.mkdirSync(exportDir, { recursive: true });
        }
        const filePath = path_1.default.join(exportDir, task.filename);
        if (format === 'excel') {
            // 导出为 Excel
            const workbook = new exceljs_1.default.Workbook();
            const worksheet = workbook.addWorksheet('Reports');
            // 设置表头
            worksheet.columns = [
                { header: '项目', key: 'project', width: 30 },
                { header: '举报人', key: 'reporter', width: 15 },
                { header: '电话', key: 'phone', width: 15 },
                { header: '分类', key: 'category', width: 20 },
                { header: '发现时间', key: 'foundAt', width: 20 },
                { header: '地点', key: 'location', width: 30 },
                { header: '描述', key: 'description', width: 50 },
                { header: '状态', key: 'status', width: 15 },
                { header: '创建时间', key: 'createdAt', width: 20 }
            ];
            // 添加数据
            reports.forEach(report => {
                worksheet.addRow({
                    project: report.project,
                    reporter: report.reporter,
                    phone: report.phone,
                    category: report.category || '',
                    foundAt: report.foundAt.toLocaleString('zh-CN'),
                    location: report.location,
                    description: report.description,
                    status: report.status || '进行中',
                    createdAt: report.createdAt.toLocaleString('zh-CN')
                });
            });
            // 保存文件
            await workbook.xlsx.writeFile(filePath);
        }
        else {
            // 导出为 CSV
            const csvContent = [
                // 表头
                ['项目', '举报人', '电话', '分类', '发现时间', '地点', '描述', '状态', '创建时间'].join(','),
                // 数据行
                ...reports.map(report => [
                    report.project,
                    report.reporter,
                    report.phone,
                    report.category || '',
                    report.foundAt.toLocaleString('zh-CN'),
                    report.location,
                    report.description,
                    report.status || '进行中',
                    report.createdAt.toLocaleString('zh-CN')
                ].map(field => `"${field}"`).join(','))
            ].join('\n');
            fs_1.default.writeFileSync(filePath, csvContent, 'utf-8');
        }
        updateExportTask(task.id, { status: 'completed' });
        res.json({
            success: true,
            data: {
                taskId: task.id,
                filename: task.filename
            }
        });
    }
    catch (error) {
        console.error('导出报告失败:', error);
        updateExportTask(task.id, {
            status: 'failed',
            error: error instanceof Error ? error.message : '未知错误'
        });
        next(error);
    }
});
// 获取导出任务状态
router.get('/export/:taskId', (req, res) => {
    try {
        const { taskId } = req.params;
        const task = exportTasks.get(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: '导出任务不存在'
            });
        }
        return res.json({
            success: true,
            data: task
        });
    }
    catch (error) {
        console.error('获取导出任务状态失败:', error);
        return res.status(500).json({
            success: false,
            error: '服务器内部错误'
        });
    }
});
// 下载导出文件
router.get('/export/:taskId/download', (req, res) => {
    try {
        const { taskId } = req.params;
        const task = exportTasks.get(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: '导出任务不存在'
            });
        }
        if (task.status !== 'completed') {
            return res.status(400).json({
                success: false,
                error: '导出任务尚未完成'
            });
        }
        const filePath = path_1.default.join(config_1.config.UPLOAD.DIR, 'exports', task.filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '导出文件不存在'
            });
        }
        return res.download(filePath, task.filename, (err) => {
            if (err) {
                console.error('下载文件失败:', err);
            }
        });
    }
    catch (error) {
        console.error('下载导出文件失败:', error);
        return res.status(500).json({
            success: false,
            error: '服务器内部错误'
        });
    }
});
// 注册错误处理中间件
router.use(errorHandler);
exports.default = router;
