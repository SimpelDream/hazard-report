import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// 导出任务状态
interface ExportTask {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  format: 'csv' | 'excel';
  filename: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// 导出任务存储
const exportTasks = new Map<string, ExportTask>();

// 创建导出任务
function createExportTask(format: 'csv' | 'excel'): ExportTask {
  const taskId = uuidv4();
  const task: ExportTask = {
    id: taskId,
    status: 'pending',
    progress: 0,
    total: 0,
    format,
    filename: `reports_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`,
    createdAt: new Date()
  };
  exportTasks.set(taskId, task);
  return task;
}

// 更新导出任务状态
function updateExportTask(taskId: string, updates: Partial<ExportTask>) {
  const task = exportTasks.get(taskId);
  if (task) {
    Object.assign(task, updates);
    if (updates.status === 'completed' || updates.status === 'failed') {
      task.completedAt = new Date();
    }
  }
}

// 清理过期任务（24小时）
function cleanupExportTasks() {
  const now = new Date();
  for (const [taskId, task] of exportTasks.entries()) {
    if (now.getTime() - task.createdAt.getTime() > 24 * 60 * 60 * 1000) {
      exportTasks.delete(taskId);
    }
  }
}

// 定期清理过期任务
setInterval(cleanupExportTasks, 60 * 60 * 1000);

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

// 状态更新日志
interface StatusUpdateLog {
  reportId: number;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// 记录状态更新日志
async function logStatusUpdate(log: StatusUpdateLog) {
  const logDir = path.join(config.LOG.DIR, 'status-updates');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, `${log.reportId}.log`);
  const logEntry = JSON.stringify(log) + '\n';

  fs.appendFileSync(logFile, logEntry);
}

// 获取状态更新日志
async function getStatusUpdateLogs(reportId: number): Promise<StatusUpdateLog[]> {
  const logFile = path.join(config.LOG.DIR, 'status-updates', `${reportId}.log`);
  
  if (!fs.existsSync(logFile)) {
    return [];
  }

  const logContent = fs.readFileSync(logFile, 'utf-8');
  return logContent
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
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
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, timestamp } = req.body;
  const userId = req.user?.id;
  const username = req.user?.username;
  let currentReport = null;

  if (!userId || !username) {
    return res.status(401).json({
      success: false,
      error: '未授权'
    });
  }

  try {
    // 获取当前状态
    currentReport = await prisma.report.findUnique({
      where: { id: parseInt(id) }
    });

    if (!currentReport) {
      return res.status(404).json({
        success: false,
        error: '报告不存在'
      });
    }

    const oldStatus = currentReport.status || '进行中';

    // 更新状态
    const updatedReport = await prisma.report.update({
      where: { id: parseInt(id) },
      data: {
        status,
        statusUpdatedAt: new Date(timestamp || Date.now())
      }
    });

    // 记录成功日志
    await logStatusUpdate({
      reportId: parseInt(id),
      oldStatus,
      newStatus: status,
      updatedBy: username,
      timestamp: new Date(),
      success: true
    });

    res.json({
      success: true,
      data: updatedReport
    });
  } catch (error) {
    console.error('更新状态失败:', error);

    // 记录失败日志
    await logStatusUpdate({
      reportId: parseInt(id),
      oldStatus: currentReport?.status || '进行中',
      newStatus: status,
      updatedBy: username,
      timestamp: new Date(),
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    });

    res.status(500).json({
      success: false,
      error: '更新状态失败'
    });
  }
});

// 获取状态更新历史
router.get('/:id/status-history', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const logs = await getStatusUpdateLogs(parseInt(id));
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('获取状态更新历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取状态更新历史失败'
    });
  }
});

// 导出报告
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  const format = (req.query.format as 'csv' | 'excel') || 'excel';
  const task = createExportTask(format);

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

    // 获取总数
    const total = await prisma.report.count({ where });
    updateExportTask(task.id, { total, status: 'processing' });

    // 分批获取数据
    const batchSize = 1000;
    const batches = Math.ceil(total / batchSize);
    const reports = [];

    for (let i = 0; i < batches; i++) {
      const batch = await prisma.report.findMany({
        where,
        skip: i * batchSize,
        take: batchSize,
        orderBy: { createdAt: 'desc' }
      });
      reports.push(...batch);
      updateExportTask(task.id, { progress: reports.length });
    }

    // 创建导出目录
    const exportDir = path.join(config.UPLOAD.DIR, 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filePath = path.join(exportDir, task.filename);

    if (format === 'excel') {
      // 导出为 Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reports');

      // 设置表头
      worksheet.columns = [
        { header: '项目', key: 'project', width: 30 },
        { header: '举报人', key: 'reporter', width: 15 },
        { header: '电话', key: 'phone', width: 15 },
        { header: '分类', key: 'category', width: 20 },
        { header: '发现时间', key: 'foundAt', width: 20 },
        { header: '地点', key: 'location', width: 30 },
        { header: '描述', key: 'description', width: 50 },
        { header: '状态', key: 'status', width: 15 },
        { header: '创建时间', key: 'createdAt', width: 20 }
      ];

      // 添加数据
      reports.forEach(report => {
        worksheet.addRow({
          project: report.project,
          reporter: report.reporter,
          phone: report.phone,
          category: report.category || '',
          foundAt: report.foundAt.toLocaleString('zh-CN'),
          location: report.location,
          description: report.description,
          status: report.status || '进行中',
          createdAt: report.createdAt.toLocaleString('zh-CN')
        });
      });

      // 保存文件
      await workbook.xlsx.writeFile(filePath);
    } else {
      // 导出为 CSV
      const csvContent = [
        // 表头
        ['项目', '举报人', '电话', '分类', '发现时间', '地点', '描述', '状态', '创建时间'].join(','),
        // 数据行
        ...reports.map(report => [
          report.project,
          report.reporter,
          report.phone,
          report.category || '',
          report.foundAt.toLocaleString('zh-CN'),
          report.location,
          report.description,
          report.status || '进行中',
          report.createdAt.toLocaleString('zh-CN')
        ].map(field => `"${field}"`).join(','))
      ].join('\n');

      fs.writeFileSync(filePath, csvContent, 'utf-8');
    }

    updateExportTask(task.id, { status: 'completed' });

    res.json({
      success: true,
      data: {
        taskId: task.id,
        filename: task.filename
      }
    });
  } catch (error) {
    console.error('导出报告失败:', error);
    updateExportTask(task.id, {
      status: 'failed',
      error: error instanceof Error ? error.message : '未知错误'
    });
    next(error);
  }
});

// 获取导出任务状态
router.get('/export/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = exportTasks.get(taskId);

  if (!task) {
    return res.status(404).json({
      success: false,
      error: '导出任务不存在'
    });
  }

  res.json({
    success: true,
    data: task
  });
});

// 下载导出文件
router.get('/export/:taskId/download', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = exportTasks.get(taskId);

  if (!task) {
    return res.status(404).json({
      success: false,
      error: '导出任务不存在'
    });
  }

  if (task.status !== 'completed') {
    return res.status(400).json({
      success: false,
      error: '导出任务尚未完成'
    });
  }

  const filePath = path.join(config.UPLOAD.DIR, 'exports', task.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: '导出文件不存在'
    });
  }

  res.download(filePath, task.filename, (err) => {
    if (err) {
      console.error('下载文件失败:', err);
    }
  });
});

// 注册错误处理中间件
router.use(errorHandler);

export default router; 