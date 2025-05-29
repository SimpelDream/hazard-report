declare module '../config' {
  export interface Config {
    SECURITY: {
      CORS_ORIGIN: string | string[];
    };
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
      MAX_SIZE: number;
    };
  }

  export const config: Config;
} 