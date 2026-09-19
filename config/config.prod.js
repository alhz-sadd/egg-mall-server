'use strict';

/**
 * 生产环境配置
 * @return {Egg.EggAppConfig} 配置对象
 */
module.exports = () => {
  return {
    // 生产环境域名
    appBaseUrl: 'http://47.238.77.10:7001',
    sequelize: {
      // 生产环境使用 MySQL，连接信息通过环境变量注入
      dialect: 'mysql',
      host: '47.238.77.10',
      port: 3306,
      database: 'egg_mall',
      username: 'egg_mall',
      password: 'pizEe5PLjGWJhnWL',
      timezone: '+08:00',
      logging: false,
    },
    proxy: true,
    jwt: {
      secret: process.env.JWT_SECRET,
    },
    redis: {
      client: {
        host: '127.0.0.1',
        port: 6379,
        password: 'Aa7890..',
        db: 0,
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
