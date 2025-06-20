module.exports = {
  apps: [{
    name: 'hazard-report',
    script: 'app.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0',
      DATABASE_URL: 'postgresql://hazard_report:hazard_report@localhost:5432/hazard_report',
      CORS_ORIGIN: '*'
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
} 