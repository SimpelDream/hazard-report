export const config = {
  SECURITY: {
    CORS_ORIGIN: '*', // 开发环境允许所有来源
  },
  API: {
    PREFIX: '/api',
    ROUTES: {
      REPORTS: '/reports',
      ORDERS: '/orders',
      UPLOADS: '/uploads',
    },
  },
  UPLOAD: {
    DIR: 'uploads',
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png'],
  },
}; 