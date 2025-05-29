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

// 获取所有报告
router.get('/', async (req, res) => {
    try {
        const reports = await prisma.report.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: reports });
    } catch (error) {
        console.error('获取报告列表失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取报告列表失败',
            details: error.message 
        });
    }
});

// 创建新报告
router.post('/', upload.array('images', config.UPLOAD.MAX_FILES), async (req, res) => {
    try {
        // 验证必填字段
        const requiredFields = ['project', 'reporter', 'phone', 'foundAt', 'location', 'description'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: '缺少必填字段',
                details: `缺少字段: ${missingFields.join(', ')}`
            });
        }

        // 验证图片
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: '请至少上传一张图片'
            });
        }

        const { project, reporter, phone, category, foundAt, location, description } = req.body;
        const images = req.files.map(file => file.filename).join(',');

        // 创建报告
        const report = await prisma.report.create({
            data: {
                project,
                reporter,
                phone,
                category: category || null,
                foundAt: new Date(foundAt),
                location,
                description,
                images,
                status: 'pending',
                createdAt: new Date()
            }
        });

        res.json({ success: true, data: report });
    } catch (error) {
        console.error('创建报告失败:', error);
        
        // 如果创建失败，删除已上传的图片
        if (req.files) {
            for (const file of req.files) {
                try {
                    await fs.unlink(path.join(config.UPLOAD.DIR, file.filename));
                } catch (unlinkError) {
                    console.error('删除上传文件失败:', unlinkError);
                }
            }
        }

        res.status(500).json({ 
            success: false, 
            error: '创建报告失败',
            details: error.message
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

module.exports = router; 