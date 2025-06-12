const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PrismaClient } = require('@prisma/client');
const config = require('../config');

const prisma = new PrismaClient();

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, config.UPLOAD.DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    if (config.UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('不支持的文件类型'), false);
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

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
    console.error('文件上传错误:', err);
    return res.status(400).json({
        success: false,
        error: err.message
    });
};

// 获取所有报告
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            project,
            category,
            reporter,
            startDate,
            endDate
        } = req.query;

        const where = {};
        if (project) where.project = project;
        if (category) where.category = category;
        if (reporter) where.reporter = { contains: reporter };
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [total, reports] = await Promise.all([
            prisma.report.count({ where }),
            prisma.report.findMany({
                where,
                skip: (page - 1) * limit,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            })
        ]);

        res.json({
            success: true,
            data: reports,
            total: total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('获取报告列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取报告列表失败'
        });
    }
});

// 创建新报告
router.post('/', upload.array('images', config.UPLOAD.MAX_FILES), async (req, res) => {
    try {
        const { project, reporter, phone, category, foundAt, location, description } = req.body;
        
        // 验证必填字段
        if (!project || !reporter || !phone || !foundAt || !location || !description) {
            return res.status(400).json({
                success: false,
                error: '缺少必填字段'
            });
        }

        // 验证图片
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: '请至少上传一张图片'
            });
        }

        // 创建报告记录
        const report = await prisma.report.create({
            data: {
                project,
                reporter,
                phone,
                category,
                foundAt: new Date(foundAt),
                location,
                description,
                images: req.files.map(file => file.filename).join(','),
                status: '进行中'
            }
        });

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('创建报告失败:', error);
        res.status(500).json({
            success: false,
            error: '创建报告失败'
        });
    }
});

// 删除报告
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 获取报告信息
        const report = await prisma.report.findUnique({
            where: { id: parseInt(id) }
        });

        if (!report) {
            return res.status(404).json({
                success: false,
                error: '报告不存在'
            });
        }

        // 删除关联的图片文件
        if (report.images) {
            const imageFiles = report.images.split(',');
            for (const filename of imageFiles) {
                try {
                    await fs.unlink(path.join(config.UPLOAD.DIR, filename));
                } catch (unlinkError) {
                    console.error('删除图片文件失败:', unlinkError);
                }
            }
        }

        // 删除报告记录
        await prisma.report.delete({
            where: { id: parseInt(id) }
        });

        res.json({ success: true, message: '报告删除成功' });
    } catch (error) {
        console.error('删除报告失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '删除报告失败',
            details: error.message
        });
    }
});

// 更新报告状态
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: '缺少 status 字段'
            });
        }

        const report = await prisma.report.update({
            where: { id: parseInt(id) },
            data: {
                status,
                statusUpdatedAt: new Date()
            }
        });

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('更新报告状态失败:', error);
        res.status(500).json({
            success: false,
            error: '更新报告状态失败'
        });
    }
});

// 获取单个报告
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const report = await prisma.report.findUnique({ where: { id: parseInt(id) } });
        if (!report) {
            return res.status(404).json({ success: false, error: '报告不存在' });
        }
        res.json({ success: true, data: report });
    } catch (error) {
        console.error('获取报告失败:', error);
        res.status(500).json({ success: false, error: '获取报告失败' });
    }
});

// 更新报告（除状态外的其它字段）
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const allowed = ['project', 'reporter', 'phone', 'category', 'foundAt', 'location', 'description'];
        const data = {};
        allowed.forEach(key => {
            if (req.body[key] !== undefined) {
                data[key] = key === 'foundAt' ? new Date(req.body[key]) : req.body[key];
            }
        });
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ success: false, error: '没有可更新的字段' });
        }
        const report = await prisma.report.update({ where: { id: parseInt(id) }, data });
        res.json({ success: true, data: report });
    } catch (error) {
        console.error('更新报告失败:', error);
        res.status(500).json({ success: false, error: '更新报告失败' });
    }
});

// 注册错误处理中间件
router.use(errorHandler);

module.exports = router; 