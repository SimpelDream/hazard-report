import { Router, Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

const router = Router();
const prisma = new PrismaClient();

// 启用CORS
router.use(cors());

interface ReportRequest extends Request {
  params: {
    id: string;
  };
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
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
    fileSize: 5 * 1024 * 1024, // 限制5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 创建报告
router.post('/', upload.array('images', 4), async (req, res) => {
  try {
    const { project, reporter, phone, category, foundAt, location, description } = req.body;
    
    // 验证必填字段
    if (!project || !reporter || !phone || !foundAt || !location || !description) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    const images = (req.files as Express.Multer.File[]).map(file => file.path);

    const report = await prisma.report.create({
      data: {
        project,
        reporter,
        phone,
        category,
        foundAt: new Date(foundAt),
        location,
        description,
        images: images as string[],
      },
    });

    res.json(report);
  } catch (error) {
    console.error('创建报告失败:', error);
    res.status(500).json({ error: '创建报告失败，请稍后重试' });
  }
});

// 获取报告列表（分页）
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const skip = (page - 1) * pageSize;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.report.count(),
    ]);

    res.json({
      reports,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取报告列表失败:', error);
    res.status(500).json({ error: '获取报告列表失败' });
  }
});

// 获取单个报告
const getReport: RequestHandler = async (req, res, next) => {
  try {
    const report = await prisma.report.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
    });

    if (!report) {
      res.status(404).json({ error: '报告不存在' });
      return;
    }

    res.json(report);
  } catch (error) {
    console.error('获取报告失败:', error);
    res.status(500).json({ error: '获取报告失败' });
  }
};

router.get('/:id', getReport);

export default router; 