import { Router, Request, Response, RequestHandler, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { config } from '../config';

const router = Router();
const prisma = new PrismaClient();

// 启用CORS
router.use(cors());

// 错误处理中间件
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('错误:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '图片大小不能超过2MB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: '最多只能上传4张图片' });
    }
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: '服务器内部错误，请稍后重试' });
};

interface ReportRequest extends Request {
  params: {
    id: string;
  };
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      console.error('创建上传目录失败:', error);
      cb(new Error('无法创建上传目录'), '');
    }
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 限制5MB
    files: 4 // 最多4个文件
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持jpg、png格式的图片'));
    }
  }
});

// 创建报告
router.post('/', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project, reporter, phone, category, foundAt, location, description } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    // 验证必填字段
    if (!project || !reporter || !phone || !foundAt || !location || !description) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    const report = await prisma.report.create({
      data: {
        project,
        reporter,
        phone,
        category,
        foundAt: new Date(foundAt),
        location,
        description,
        images: imageUrl ? [imageUrl] : []
      },
    });

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('创建报告失败:', error);
    next(error);
  }
});

// 获取报告列表（分页）
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const project = req.query.project as string;
    const category = req.query.category as string;
    const reporter = req.query.reporter as string;
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;

    // 构建查询条件
    const where: any = {};
    if (project) where.project = project;
    if (category) where.category = category;
    if (reporter) where.reporter = reporter;
    if (fromDate && toDate) {
      where.foundAt = {
        gte: new Date(fromDate),
        lte: new Date(toDate)
      };
    }

    const total = await prisma.report.count({ where });
    const pages = Math.ceil(total / limit);

    const data = await prisma.report.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data, total, pages });
  } catch (err) {
    console.error('查询报告失败:', err);
    res.status(500).json({ error: '查询失败' });
  }
});

// 获取单个报告
const getReport: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await prisma.report.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
    });

    if (!report) {
      return res.status(404).json({ 
        success: false,
        error: '报告不存在' 
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('获取报告失败:', error);
    next(error);
  }
};

router.get('/:id', getReport);

// 更新报告状态
router.patch('/:id/status', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  try {
    const updated = await prisma.report.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date()
      }
    });
    res.json(updated);
  } catch (err) {
    console.error(`更新报告 ${id} 状态失败:`, err);
    res.status(500).json({ error: '更新状态失败' });
  }
});

// 使用错误处理中间件
router.use(errorHandler);

module.exports = router; 