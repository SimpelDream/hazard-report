"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const path_1 = __importDefault(require("path"));
// 获取项目根目录
const rootDir = path_1.default.resolve(__dirname, '..');
exports.config = {
    SERVER: {
        PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
        HOST: process.env.HOST || '127.0.0.1',
        NODE_ENV: process.env.NODE_ENV || 'development'
    },
    DATABASE: {
        PROVIDER: process.env.DB_PROVIDER || 'sqlite',
        URL: process.env.DATABASE_URL || `file:${path_1.default.join(rootDir, 'prisma', 'dev.db')}`
    },
    UPLOAD: {
        DIR: process.env.UPLOAD_DIR || path_1.default.join(rootDir, 'uploads'),
        MAX_SIZE: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 5 * 1024 * 1024,
        ALLOWED_TYPES: ['image/jpeg', 'image/png'],
        MAX_FILES: 4
    },
    API: {
        PREFIX: '/api',
        VERSION: 'v1',
        ROUTES: {
            REPORTS: '/reports',
            ORDERS: '/orders',
            UPLOADS: '/uploads'
        }
    },
    SECURITY: {
        CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
        RATE_LIMIT: {
            WINDOW_MS: 15 * 60 * 1000,
            MAX: 100 // 限制每个IP 15分钟内最多100个请求
        }
    },
    LOG: {
        DIR: process.env.LOG_DIR || path_1.default.join(rootDir, 'logs'),
        LEVEL: process.env.LOG_LEVEL || 'debug'
    }
};
