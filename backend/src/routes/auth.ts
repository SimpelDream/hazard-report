import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// 扩展 Request 类型以包含 user 属性
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
      };
    }
  }
}

// 登录接口
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    // 验证用户
    const user = await prisma.$queryRaw`
      SELECT * FROM "User" WHERE username = ${username}
    `;
    
    if (!user || !Array.isArray(user) || user.length === 0) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }
    
    const userData = user[0];
    
    // 验证密码
    const isValid = await bcrypt.compare(password, userData.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }
    
    // 生成 JWT
    const token = jwt.sign(
      { id: userData.id, username: userData.username, role: userData.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    return res.json({
      success: true,
      token,
      user: {
        id: userData.id,
        username: userData.username,
        role: userData.role
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 验证 token 的中间件
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: '未提供认证令牌'
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '无效的认证令牌'
    });
  }
};

export default router; 