import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// 获取文件列表
router.get('/', (_req, res) => {
  return res.json({
    success: true,
    data: []
  });
});

// 获取单个文件
router.get('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../orders', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }
    
    return res.sendFile(filePath);
  } catch (error) {
    console.error('获取文件错误:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

export default router; 