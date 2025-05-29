import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// 获取文件列表
router.get('/', (req, res) => {
  try {
    const ordersDir = path.join(__dirname, '../../orders');
    if (!fs.existsSync(ordersDir)) {
      fs.mkdirSync(ordersDir, { recursive: true });
    }
    
    const files = fs.readdirSync(ordersDir)
      .filter(file => !file.startsWith('.'))
      .map(file => ({
        name: file,
        size: fs.statSync(path.join(ordersDir, file)).size,
        lastModified: fs.statSync(path.join(ordersDir, file)).mtime
      }));

    res.json(files);
  } catch (error) {
    console.error('获取文件列表失败:', error);
    res.status(500).json({ error: '获取文件列表失败' });
  }
});

// 获取单个文件
router.get('/:filename', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../orders', req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    res.sendFile(filePath);
  } catch (error) {
    console.error('获取文件失败:', error);
    res.status(500).json({ error: '获取文件失败' });
  }
});

module.exports = router; 