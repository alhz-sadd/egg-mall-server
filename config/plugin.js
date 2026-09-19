'use strict';

/** @type Egg.EggPlugin */
module.exports = {
  // Sequelize ORM 插件
  sequelize: {
    enable: true,
    package: 'egg-sequelize',
  },
  // Redis 缓存插件
  redis: {
    enable: true,
    package: 'egg-redis',
  },
  // JWT 认证插件
  jwt: {
    enable: true,
    package: 'egg-jwt',
  },
  // bcrypt 密码加密插件
  bcrypt: {
    enable: true,
    package: 'egg-bcrypt',
  },
  // 跨域支持插件
  cors: {
    enable: true,
    package: 'egg-cors',
  },
  // Swagger API 文档插件
  swaggerdoc: {
    enable: true,
    package: 'egg-swagger-doc',
  },
  // 参数校验插件
  validate: {
    enable: true,
    package: 'egg-validate',
  },
  // 静态文件服务插件
  static: {
    enable: true,
  },
  // OSS 插件
  oss: {
    enable: true,
    package: 'egg-oss',
  },
};
