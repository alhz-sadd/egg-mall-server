'use strict';

/**
 * 生产环境配置
 * @return {Egg.EggAppConfig} 配置对象
 */
module.exports = () => {
  return {
    // 生产环境域名
    appBaseUrl: process.env.APP_BASE_URL || 'http://47.238.77.10:7001',
    sequelize: {
      // 生产环境使用 MySQL，连接信息通过环境变量注入
      dialect: 'mysql',
      host: process.env.DB_HOST || '47.238.77.10',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      database: process.env.DB_DATABASE || 'egg_mall',
      username: process.env.DB_USER || 'egg_mall',
      password: process.env.DB_PASSWORD || 'pizEe5PLjGWJhnWL',
      timezone: '+08:00',
      logging: false,
    },
    // 强制开启代理信任
    proxy: true,
    maxProxyCount: 1, // 告诉 Egg.js 前面有 1 层代理 (Nginx)
    jwt: {
      secret: process.env.JWT_SECRET || 'your_jwt_secret_change_in_production',
    },
    redis: {
      client: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
        password: process.env.REDIS_PASSWORD || 'Aa7890..',
        db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
      },
    },
    security: {
      csrf: {
        enable: false,
      },
    },
    logger: {
      level: 'INFO',
      consoleLevel: 'INFO',
    },
  };
};
