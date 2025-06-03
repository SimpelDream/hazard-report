// 服务器配置
const SERVER = {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || 'localhost',
    NODE_ENV: process.env.NODE_ENV || 'development'
};

// 数据库配置
const DATABASE = {
    URL: process.env.DATABASE_URL || 'file:./dev.db'
};

// 文件上传配置
const UPLOAD = {
    DIR: 'uploads',
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_FILES: 5,
    ALLOWED_TYPES: [
        'image/jpeg',
        'image/png',
        'image/gif'
    ]
};

// API 路由配置
const API = {
    PREFIX: '/api',
    VERSION: 'v1',
    RATE_LIMIT: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX: 100 // limit each IP to 100 requests per windowMs
    }
};

// 安全配置
const SECURITY = {
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    JWT_EXPIRES_IN: '24h',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    CORS_METHODS: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    CORS_HEADERS: ['Content-Type', 'Authorization']
};

// 日志配置
const LOGGING = {
    LEVEL: process.env.LOG_LEVEL || 'info',
    DIR: 'logs',
    MAX_SIZE: '10m',
    MAX_FILES: '7d'
};

// 导出配置
module.exports = {
    SERVER,
    DATABASE,
    UPLOAD,
    API,
    SECURITY,
    LOGGING
}; 