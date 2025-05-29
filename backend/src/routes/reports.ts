import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

const router = Router();
const prisma = new PrismaClient();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = config.UPLOAD.DIR;
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
    fileSize: config.UPLOAD.MAX_SIZE,
    files: config.UPLOAD.MAX_FILES
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (config.UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持jpg、png格式的图片'));
    }
  }
});

// 错误处理中间件
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('错误:', err);
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        error: `图片大小不能超过${config.UPLOAD.MAX_SIZE / 1024 / 1024}MB` 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        success: false,
        error: `最多只能上传${config.UPLOAD.MAX_FILES}张图片` 
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        success: false,
        error: '意外的字段名称，请确保表单字段名称正确' 
      });
    }
    return res.status(400).json({ 
      success: false,
      error: `上传文件错误: ${err.message}` 
    });
  }
  res.status(500).json({ 
    success: false,
    error: '服务器内部错误，请稍后重试' 
  });
};

interface ReportRequest extends Request {
  params: {
    id: string;
  };
}

// 创建报告
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  // 使用try-catch包装multer中间件
  try {
    upload.array('images', config.UPLOAD.MAX_FILES)(req, res, async (err) => {
      if (err) {
        // 如果multer处理过程中出错，直接传递给错误处理中间件
        return next(err);
      }
      
      try {
        const { project, reporter, phone, category, foundAt, location, description } = req.body;
        
        // 验证必填字段
        if (!project || !reporter || !phone || !foundAt || !location || !description) {
          return res.status(400).json({ 
            success: false,
            error: '请填写所有必填字段' 
          });
        }

        // 验证文件上传
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
          return res.status(400).json({ 
            success: false,
            error: '请至少上传一张图片' 
          });
        }

        const files = req.files as Express.Multer.File[];
        // 处理图片路径
        const imagePaths = files.map(file => `${config.API.ROUTES.UPLOADS}/${file.filename}`).join(',');

        const report = await prisma.report.create({
          data: {
            project,
            reporter,
            phone,
            category,
            foundAt: new Date(foundAt),
            location,
            description,
            images: imagePaths
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
  } catch (error) {
    console.error('Multer处理失败:', error);
    next(error);
  }
});

// 获取报告列表（分页）
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    if (req.query.project) {
      where.project = req.query.project;
    }
    if (req.query.status) {
      where.status = req.query.status;
    }
    if (req.query.startDate && req.query.endDate) {
      where.foundAt = {
        gte: new Date(req.query.startDate as string),
        lte: new Date(req.query.endDate as string)
      };
    }

    // 获取总数
    const total = await prisma.report.count({ where });

    // 获取数据
    const reports = await prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取报告列表失败:', error);
    next(error);
  }
});

// 获取单个报告
router.get('/:id', async (req: ReportRequest, res: Response, next: NextFunction) => {
  try {
    const report = await prisma.report.findUnique({
      where: {
        id: parseInt(req.params.id)
      }
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
    console.error('获取报告详情失败:', error);
    next(error);
  }
});

// 更新报告状态
router.patch('/:id/status', async (req: ReportRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: '请提供状态值'
      });
    }

    const report = await prisma.report.update({
      where: {
        id: parseInt(req.params.id)
      },
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
    next(error);
  }
});

// 导出报告
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 构建查询条件
    const where: any = {};
    if (req.query.project) {
      where.project = req.query.project;
    }
    if (req.query.status) {
      where.status = req.query.status;
    }
    if (req.query.startDate && req.query.endDate) {
      where.foundAt = {
        gte: new Date(req.query.startDate as string),
        lte: new Date(req.query.endDate as string)
      };
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 设置响应头
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=reports.csv');

    // 写入CSV头
    res.write('项目,举报人,电话,分类,发现时间,地点,描述,状态,创建时间\n');

    // 写入数据
    reports.forEach(report => {
      const row = [
        report.project,
        report.reporter,
        report.phone,
        report.category || '',
        report.foundAt.toISOString(),
        report.location,
        report.description,
        report.status,
        report.createdAt.toISOString()
      ].map(field => `"${field}"`).join(',');
      res.write(row + '\n');
    });

    res.end();
  } catch (error) {
    console.error('导出报告失败:', error);
    next(error);
  }
});

// 注册错误处理中间件
router.use(errorHandler);

export default router; 