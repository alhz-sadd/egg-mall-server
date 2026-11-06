'use strict';

/**
 * 本地开发环境配置
 * @return {Egg.EggAppConfig} 配置对象
 */
module.exports = () => {
  return {
    // 本地开发域名
    appBaseUrl: process.env.APP_BASE_URL || 'http://127.0.0.1:7001',
    sequelize: {
      // 本地开发使用 MySQL
      dialect: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      database: process.env.DB_DATABASE || 'egg_test',
      username: process.env.DB_USERNAME || 'egg_test',
      password: process.env.DB_PASSWORD || 'CmH3WLkLLK5GM8SW',
      timezone: '+08:00',
      logging: console.log,
    },
    logger: {
      level: 'DEBUG',
      consoleLevel: 'DEBUG',
    },
    // 本地开发关闭部分安全限制，便于调试
    security: {
      csrf: {
        enable: false,
      },
    },
    // 本地开发使用本地 Redis
    redis: {
      client: {
        port: 6379,
        host: '127.0.0.1',
        password: '',
        db: 0,
      },
    },
  };
};
