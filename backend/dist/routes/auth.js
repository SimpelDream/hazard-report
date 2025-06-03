"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
// 登录接口
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // 验证用户
        const user = await prisma.$queryRaw `
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
        const isValid = await bcryptjs_1.default.compare(password, userData.password);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: '用户名或密码错误'
            });
        }
        // 生成 JWT
        const token = jsonwebtoken_1.default.sign({ id: userData.id, username: userData.username, role: userData.role }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({
            success: true,
            token,
            user: {
                id: userData.id,
                username: userData.username,
                role: userData.role
            }
        });
    }
    catch (error) {
        console.error('登录错误:', error);
        return res.status(500).json({
            success: false,
            error: '服务器内部错误'
        });
    }
});
// 验证 token 的中间件
const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                error: '未提供认证令牌'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        return next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            error: '无效的认证令牌'
        });
    }
};
exports.authMiddleware = authMiddleware;
exports.default = router;
