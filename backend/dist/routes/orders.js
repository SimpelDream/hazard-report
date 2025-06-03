"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
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
        const filePath = path_1.default.join(__dirname, '../../orders', filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '文件不存在'
            });
        }
        return res.sendFile(filePath);
    }
    catch (error) {
        console.error('获取文件错误:', error);
        return res.status(500).json({
            success: false,
            error: '服务器内部错误'
        });
    }
});
exports.default = router;
