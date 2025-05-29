const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
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
        res.status(500).json({ success: false, error: '获取报告列表失败' });
    }
});

// 创建新报告
router.post('/', upload.array('images', config.UPLOAD.MAX_FILES), async (req, res) => {
    try {
        const { project, reporter, phone, category, foundAt, location, description } = req.body;
        const images = req.files ? req.files.map(file => file.filename).join(',') : null;

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

        res.json({ success: true, data: report });
    } catch (error) {
        console.error('创建报告失败:', error);
        res.status(500).json({ success: false, error: '创建报告失败' });
    }
});

// 删除报告
router.delete('/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../../', config.UPLOAD.DIR, filename);
        
        await fs.unlink(filePath);
        res.json({ message: '文件删除成功' });
    } catch (error) {
        console.error('删除文件失败:', error);
        res.status(500).json({ error: '删除文件失败' });
    }
});

module.exports = router; 