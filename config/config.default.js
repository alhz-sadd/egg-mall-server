'use strict';

require('dotenv').config();

/**
 * 默认配置文件，所有环境都会加载
 * @param {Egg.EggAppInfo} appInfo 应用信息
 * @return {Egg.EggAppConfig} 配置对象
 */
module.exports = appInfo => {
  /** @type {Egg.EggAppConfig} */
  const config = {};

  // Cookie 安全密钥，生产环境务必修改
  config.keys = appInfo.name + '_mall_secret_key_2026';

  // 加载的中间件，按数组顺序执行
  config.middleware = [ 'i18nResponse', 'errorHandler', 'requestLog', 'operationLog', 'formatImageUrl' ];

  // 安全插件配置
  config.security = {
    csrf: {
      enable: false, // 前后端分离项目通常关闭 CSRF
    },
  };

  // 跨域配置
  config.cors = {
    origin: '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
  };

  // JWT 配置
  config.jwt = {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_change_in_production',
    expiresIn: '7h', // Access Token 过期时间
    refreshExpiresIn: '30d', // Refresh Token 过期时间
  };

  // bcrypt 密码加密配置
  config.bcrypt = {
    saltRounds: 10,
  };

  // 文件上传配置
  const path = require('path');
  config.multipart = {
    mode: 'file',
    fileSize: '10mb',
    fileExtensions: [ '.jpg', '.jpeg', '.png', '.gif', '.webp' ],
    // 自定义上传临时目录，避免线上部署时系统 /tmp 目录无权限 (EACCES) 的问题
    tmpdir: path.join(appInfo.baseDir, 'run/multipart-tmp'),
  };

  // OSS 配置
  config.oss = {
    client: {
      accessKeyId: process.env.OSS_ACCESS_KEY_ID || 'your_access_key_id',
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || 'your_access_key_secret',
      endpoint: process.env.OSS_ENDPOINT || 'oss-cn-hongkong.aliyuncs.com', // 注意：香港节点应该是 oss-cn-hongkong
      bucket: process.env.OSS_BUCKET || 'mall-assect',
    },
  };

  // Sequelize 数据库配置
  config.sequelize = {
    dialect: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    database: process.env.DB_DATABASE || 'egg_mall',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    define: {
      underscored: false,
      freezeTableName: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    // 开发环境可开启 SQL 日志
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  };

  // Redis 配置
  config.redis = {
    client: {
      port: 6379,
      host: '127.0.0.1',
      password: '',
      db: 0,
    },
  };

  // 日志配置
  config.logger = {
    level: 'INFO',
    consoleLevel: 'DEBUG',
  };

  // i18n 多语言配置
  config.i18n = {
    defaultLocale: 'zh-CN', // 默认语言
    queryField: 'locale', // 从 query 字段获取语言，例如 ?locale=en-US
    cookieField: 'locale', // 从 cookie 获取语言
    headerField: 'accept-language', // 从 header 获取
  };

  // 统一响应格式中间件配置
  config.errorHandler = {
    // 是否返回详细错误堆栈（开发环境开启）
    detailed: appInfo.env === 'local',
  };

  // 静态文件服务配置
  config.static = {
    prefix: '/public/',
    dir: path.join(appInfo.baseDir, 'app/public'),
    dynamic: true,
    preload: false,
    maxAge: 31536000,
    buffer: false,
  };

  // 强制开启代理信任，不管什么环境都生效
  config.proxy = true;
  config.maxProxyCount = 1; // 告诉 Egg.js 前面有 1 层代理 (Nginx)
  config.appBaseUrl = process.env.APP_BASE_URL || '';

  // Swagger API 文档配置
  // egg-swagger-doc 的 dirScanner 只接受单个字符串路径，设置为其父目录即可递归扫描 mobile/admin 子目录
  config.swaggerdoc = {
    dirScanner: './app/controller',
    apiInfo: {
      title: '商城后端服务 API',
      description: '基于 Egg.js 的商城后端服务接口文档',
      version: '1.0.0',
    },
    schemes: [ 'http', 'https' ],
    consumes: [ 'application/json', 'multipart/form-data' ],
    produces: [ 'application/json' ],
    securityDefinitions: {
      Bearer: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
      },
    },
    enableSecurity: true,
    enableValidate: false,
    routerMap: false,
    enable: true,
  };

  return config;
};
