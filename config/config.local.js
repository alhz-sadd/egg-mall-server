'use strict';

/**
 * 本地开发环境配置
 * @return {Egg.EggAppConfig} 配置对象
 */
module.exports = () => {
  return {
    // 本地开发域名
    appBaseUrl: 'http://127.0.0.1:7001',
    sequelize: {
      // 本地开发使用 MySQL，连接信息通过环境变量注入，默认值为本地开发库
      dialect: 'mysql',
      host: '47.238.77.10',
      port: 3306,
      database: 'egg_mall',
      username: 'egg_mall',
      password: 'pizEe5PLjGWJhnWL',
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
