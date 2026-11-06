'use strict';

/**
 * 生产环境配置
 * @return {Egg.EggAppConfig} 配置对象
 */
module.exports = () => {
  return {
    // 生产环境域名
    appBaseUrl: process.env.APP_BASE_URL || 'http://47.131.176.215:7001',
    sequelize: {
      // 生产环境使用 MySQL
      dialect: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      database: process.env.DB_DATABASE || 'egg_mall',
      username: process.env.DB_USERNAME || 'egg_mall',
      password: process.env.DB_PASSWORD || 'rW5fnfCwJe3nrfHb',
      timezone: '+08:00',
      logging: false,
    },
    // 强制开启代理信任
    proxy: true,
    maxProxyCount: 1, // 告诉 Egg.js 前面有 1 层代理 (Nginx)
    jwt: {
      secret: process.env.JWT_SECRET || 'a_very_secure_and_random_string_for_production',
    },
    redis: {
      client: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
        password: process.env.REDIS_PASSWORD,
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
