/**
 * PM2 进程配置（宝塔 Node 项目管理可直接引用）
 * 用法：在 backend 目录执行
 *   pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'farm-backend',
      cwd: '/www/wwwroot/farm/backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/www/wwwlogs/farm-backend-error.log',
      out_file: '/www/wwwlogs/farm-backend-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
