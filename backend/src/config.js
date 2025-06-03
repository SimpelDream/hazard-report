require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    LOG_DIR: process.env.LOG_DIR || './logs',
    EXPORT_DIR: process.env.EXPORT_DIR || './exports',
    API_PREFIX: '/api',
    ROUTES: {
        REPORTS: '/reports',
        ORDERS: '/orders',
        AUTH: '/auth'
    },
    UPLOAD: {
        MAX_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif']
    }
};