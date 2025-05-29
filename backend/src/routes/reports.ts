import { Router, Request, Response, RequestHandler, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

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
router.post('/', upload.array('images', 4), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { project, reporter, phone, category, foundAt, location, description } = req.body;
    
    // 验证必填字段
    if (!project || !reporter || !phone || !foundAt || !location || !description) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    // 验证文件上传
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: '请至少上传一张图片' });
    }

    const files = req.files as Express.Multer.File[];
    // 修改图片路径处理
    const imagePaths = files.map(file => {
      const relativePath = path.relative(path.join(__dirname, '../..'), file.path);
      return relativePath.replace(/\\/g, '/');
    }).join(',');

    const report = await prisma.report.create({
      data: {
        project,
        reporter,
        phone,
        category,
        foundAt: new Date(foundAt),
        location,
        description,
        images: imagePaths,
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
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      }
    });
  } catch (error) {
    console.error('获取报告列表失败:', error);
    next(error);
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

// 使用错误处理中间件
router.use(errorHandler);

module.exports = router; 