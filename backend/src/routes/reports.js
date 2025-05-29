const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const config = require('../config');

// 获取所有报告
router.get('/', async (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, '../../', config.UPLOAD.DIR);
        const files = await fs.readdir(uploadsDir);
        const reports = files.map(file => ({
            name: file,
            path: `/uploads/${file}`,
            createdAt: fs.stat(path.join(uploadsDir, file)).then(stat => stat.birthtime)
        }));
        res.json(reports);
    } catch (error) {
        console.error('获取报告列表失败:', error);
        res.status(500).json({ error: '获取报告列表失败' });
    }
});

// 上传报告
router.post('/', async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }

        const file = req.files.file;
        const uploadPath = path.join(__dirname, '../../', config.UPLOAD.DIR, file.name);

        await file.mv(uploadPath);
        res.json({ message: '文件上传成功', path: `/uploads/${file.name}` });
    } catch (error) {
        console.error('上传文件失败:', error);
        res.status(500).json({ error: '上传文件失败' });
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