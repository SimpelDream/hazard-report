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
  API: {
    PREFIX: '/api',
    ROUTES: {
      REPORTS: '/reports',
      ORDERS: '/orders',
      UPLOADS: '/uploads'
    }
  },
  UPLOAD: {
    DIR: 'uploads'
  },
  SECURITY: {
    CORS_ORIGIN: '*'
  }
}; 