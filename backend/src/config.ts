import path from 'path';

interface Config {
  SERVER: {
    PORT: number;
    HOST: string;
    NODE_ENV: string;
  };
  DATABASE: {
    PROVIDER: string;
    URL: string;
  };
  UPLOAD: {
    DIR: string;
    MAX_SIZE: number;
    ALLOWED_TYPES: string[];
    MAX_FILES: number;
  };
  API: {
    PREFIX: string;
    VERSION: string;
    ROUTES: {
      REPORTS: string;
      ORDERS: string;
      UPLOADS: string;
    };
  };
  SECURITY: {
    CORS_ORIGIN: string;
    RATE_LIMIT: {
      WINDOW_MS: number;
      MAX: number;
    };
  };
  LOG: {
    DIR: string;
    LEVEL: string;
  };
}

// 获取项目根目录
const rootDir = path.resolve(__dirname, '..');

export const config: Config = {
  SERVER: {
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    HOST: process.env.HOST || '127.0.0.1',
    NODE_ENV: process.env.NODE_ENV || 'development'
  },
  DATABASE: {
    PROVIDER: process.env.DB_PROVIDER || 'sqlite',
    URL: process.env.DATABASE_URL || `file:${path.join(rootDir, 'prisma', 'dev.db')}`
  },
  UPLOAD: {
    DIR: process.env.UPLOAD_DIR || path.join(rootDir, 'uploads'),
    MAX_SIZE: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 5 * 1024 * 1024, // 5MB
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
      WINDOW_MS: 15 * 60 * 1000, // 15分钟
      MAX: 100 // 限制每个IP 15分钟内最多100个请求
    }
  },
  LOG: {
    DIR: process.env.LOG_DIR || path.join(rootDir, 'logs'),
    LEVEL: process.env.LOG_LEVEL || 'debug'
  }
}; 