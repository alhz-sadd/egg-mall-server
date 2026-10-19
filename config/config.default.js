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

  // Cookie 安全密钥，生产环境务必修改，已移至 .env
  config.keys = process.env.COOKIE_SECRET_KEY;

  // 加载的中间件，按数组顺序执行
  config.middleware = [ 'i18nResponse', 'errorHandler', 'requestLog', 'operationLog', 'formatImageUrl' ];

  // 跨域配置
  config.cors = {
    origin: ctx => ctx.request.header.origin || '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
    allowHeaders: 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma, Expires, Accept-Language, language, lang, token, shop-id, tenant-id',
    exposeHeaders: 'Authorization, Cache-Control, Content-Type, Expires, Pragma',
    credentials: true,
  };

  // 安全插件配置
  config.security = {
    csrf: {
      enable: false, // 前后端分离项目通常关闭 CSRF
    },
    domainWhiteList: [ '*' ], // 允许所有域名跨域访问，后续依靠 CORS 插件的 origin 函数做动态校验
  };

  // JWT 配置
  config.jwt = {
    secret: process.env.JWT_SECRET,
    expiresIn: '2h', // Access Token 过期时间
    refreshExpiresIn: '7d', // Refresh Token 过期时间
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
  config.cluster = {
    listen: {
      port: 7001,
      hostname: '0.0.0.0',
    },
    // 注意：高并发场景下切勿将 workers 锁死为 1。注释掉或设为 CPU 核心数，充分利用多核性能
    // workers: 1,
  };
  // OSS 配置
  config.oss = {
    client: {
      accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
      endpoint: process.env.OSS_ENDPOINT || 'oss-cn-hongkong.aliyuncs.com', // 注意：香港节点应该是 oss-cn-hongkong
      bucket: process.env.OSS_BUCKET || 'mall-assect',
      secure: true, // 强制返回 https 协议的 URL
    },
  };

  // Sequelize 数据库配置
  config.sequelize = {
    dialect: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    database: 'egg-test',
    username: 'egg-test',
    password: process.env.DB_PASSWORD,
    define: {
      underscored: false,
      freezeTableName: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    // 增加连接池配置，防止高并发下连接被打满导致查询超时 (Telegram场景)
    pool: {
      max: 100, // 最大连接数（默认是 5，非常小）
      min: 0,
      acquire: 30000, // 获取连接的超时时间（毫秒）
      idle: 10000, // 连接空闲释放时间（毫秒）
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
