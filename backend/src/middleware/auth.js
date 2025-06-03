const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const config = require('../config');

const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: '未提供认证令牌'
            });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                error: '无效的认证令牌格式'
            });
        }

        try {
            const decoded = jwt.verify(token, config.SECURITY.JWT_SECRET);
            const admin = await prisma.admin.findUnique({
                where: { id: decoded.id }
            });

            if (!admin) {
                return res.status(401).json({
                    success: false,
                    error: '管理员不存在'
                });
            }

            req.admin = admin;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: '认证令牌已过期'
                });
            }
            return res.status(401).json({
                success: false,
                error: '无效的认证令牌'
            });
        }
    } catch (error) {
        console.error('认证中间件错误:', error);
        res.status(500).json({
            success: false,
            error: '认证过程发生错误'
        });
    }
}; 