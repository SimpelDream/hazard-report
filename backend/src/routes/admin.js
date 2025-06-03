const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const authMiddleware = require('../middleware/auth');
const config = require('../config');
const path = require('path');
const fs = require('fs').promises;

const prisma = new PrismaClient();

// 管理员登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const admin = await prisma.admin.findUnique({
      where: { username }
    });

    if (!admin || !await bcrypt.compare(password, admin.password)) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      config.SECURITY.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      error: '登录失败'
    });
  }
});

// 获取报告列表（带分页和筛选）
router.get('/reports', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      project,
      category,
      reporter,
      status,
      startDate,
      endDate
    } = req.query;

    const where = {};
    if (project) where.project = project;
    if (category) where.category = category;
    if (reporter) where.reporter = { contains: reporter };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({
      success: true,
      data: {
        reports,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取报告列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取报告列表失败'
    });
  }
});

// 获取单个报告详情
router.get('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const report = await prisma.report.findUnique({ where: { id: parseInt(id) } });
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('加载详情失败:', error);
    res.status(500).json({ success: false, error: '加载详情失败' });
  }
});

// 更新报告状态
router.patch('/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: '状态不能为空'
      });
    }

    const report = await prisma.report.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('更新状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新状态失败'
    });
  }
});

// 导出报告
router.get('/reports/export', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('隐患报告');

    worksheet.columns = [
      { header: '项目', key: 'project', width: 20 },
      { header: '报告人', key: 'reporter', width: 15 },
      { header: '联系电话', key: 'phone', width: 15 },
      { header: '隐患分类', key: 'category', width: 15 },
      { header: '发现时间', key: 'foundAt', width: 20 },
      { header: '位置', key: 'location', width: 30 },
      { header: '描述', key: 'description', width: 50 },
      { header: '状态', key: 'status', width: 10 },
      { header: '创建时间', key: 'createdAt', width: 20 }
    ];

    reports.forEach(report => {
      worksheet.addRow({
        project: report.project,
        reporter: report.reporter,
        phone: report.phone,
        category: report.category,
        foundAt: report.foundAt.toLocaleString(),
        location: report.location,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt.toLocaleString()
      });
    });

    const exportDir = path.join(__dirname, '../../exports');
    await fs.mkdir(exportDir, { recursive: true });

    const filename = `reports_${Date.now()}.xlsx`;
    const filepath = path.join(exportDir, filename);
    await workbook.xlsx.writeFile(filepath);

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('下载文件失败:', err);
      }
      // 删除临时文件
      fs.unlink(filepath).catch(console.error);
    });
  } catch (error) {
    console.error('导出报告失败:', error);
    res.status(500).json({
      success: false,
      error: '导出报告失败'
    });
  }
});

module.exports = router; 