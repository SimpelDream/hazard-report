const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const config = require('../config');

// 获取所有文件列表
router.get('/', async (req, res) => {
    try {
        const ordersDir = path.join(__dirname, '../../orders');
        
        // 确保目录存在
        try {
            await fs.access(ordersDir);
        } catch {
            await fs.mkdir(ordersDir, { recursive: true });
        }
        
        // 读取目录内容
        const files = await fs.readdir(ordersDir);
        
        // 获取文件信息
        const fileList = await Promise.all(files.map(async (filename) => {
            const filePath = path.join(ordersDir, filename);
            const stats = await fs.stat(filePath);
            return {
                name: filename,
                size: stats.size,
                lastModified: stats.mtimeMs
            };
        }));
        
        res.json(fileList);
    } catch (error) {
        console.error('获取文件列表失败:', error);
        res.status(500).json({ error: '获取文件列表失败' });
    }
});

// 下载文件
router.get('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../../orders', filename);
        
        // 检查文件是否存在
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: '文件不存在' });
        }
        
        // 发送文件
        res.download(filePath);
    } catch (error) {
        console.error('下载文件失败:', error);
        res.status(500).json({ error: '下载文件失败' });
    }
});

module.exports = router; 