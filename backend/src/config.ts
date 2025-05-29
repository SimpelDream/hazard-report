<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
export const config = {
  SECURITY: {
    CORS_ORIGIN: '*', // 开发环境允许所有来源
  },
=======
=======
>>>>>>> parent of 0d40825 (改错17)
=======
>>>>>>> parent of 0d40825 (改错17)
interface Config {
  API: {
    PREFIX: string;
    ROUTES: {
      REPORTS: string;
      ORDERS: string;
      UPLOADS: string;
    };
  };
  UPLOAD: {
    DIR: string;
  };
  SECURITY: {
    CORS_ORIGIN: string;
  };
}

export const config: Config = {
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 0d40825 (改错17)
=======
>>>>>>> parent of 0d40825 (改错17)
=======
>>>>>>> parent of 0d40825 (改错17)
  API: {
    PREFIX: '/api',
    ROUTES: {
      REPORTS: '/reports',
      ORDERS: '/orders',
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      UPLOADS: '/uploads',
    },
  },
  UPLOAD: {
    DIR: 'uploads',
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png'],
  },
=======
=======
>>>>>>> parent of 0d40825 (改错17)
=======
>>>>>>> parent of 0d40825 (改错17)
      UPLOADS: '/uploads'
    }
  },
  UPLOAD: {
    DIR: 'uploads'
  },
  SECURITY: {
    CORS_ORIGIN: '*'
  }
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 0d40825 (改错17)
=======
>>>>>>> parent of 0d40825 (改错17)
=======
>>>>>>> parent of 0d40825 (改错17)
}; 