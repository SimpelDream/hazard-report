// 服务器配置
const SERVER = {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || 'localhost',
    NODE_ENV: process.env.NODE_ENV || 'development'
};

// 数据库配置
const DATABASE = {
    PROVIDER: process.env.DB_PROVIDER || 'sqlite',
    URL: process.env.DATABASE_URL || 'file:./prisma/dev.db'
};

// 文件上传配置
const UPLOAD = {
    DIR: process.env.UPLOAD_DIR || 'uploads',
    MAX_SIZE: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf']
};

// API 路由配置
const API = {
    PREFIX: '/api',
    VERSION: 'v1',
    ROUTES: {
        REPORTS: '/reports',
        UPLOADS: '/uploads'
    }
};

// 安全配置
const SECURITY = {
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    RATE_LIMIT: {
        WINDOW_MS: 15 * 60 * 1000, // 15分钟
        MAX: 100 // 限制每个IP 15分钟内最多100个请求
    }
};

// 日志配置
const LOG = {
    DIR: process.env.LOG_DIR || 'logs',
    LEVEL: process.env.LOG_LEVEL || 'info'
};

// 导出配置
module.exports = {
    SERVER,
    DATABASE,
    UPLOAD,
    API,
    SECURITY,
    LOG
}; 