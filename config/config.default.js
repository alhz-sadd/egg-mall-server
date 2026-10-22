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
  config.middleware = [ 'blockCn', 'mobileNoCache', 'i18nResponse', 'errorHandler', 'requestLog', 'operationLog', 'formatImageUrl' ];

  // 跨域配置
  config.cors = {
    origin: ctx => ctx.request.header.origin || '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
    allowHeaders: 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma, Expires, Accept-Language, language, lang, token, shop-id, tenant-id',
    exposeHeaders: 'Authorization, Cache-Control, Content-Type, Expires, Pragma',
    credentials: true,
  };

  // body 解析器配置 (防断流截断)
  config.bodyParser = {
    enable: true,
    encoding: 'utf8',
    formLimit: '10mb',
    jsonLimit: '10mb',
    strict: true,
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
  // 集群和网络底层配置
  config.cluster = {
    listen: {
      port: 7001,
      hostname: '0.0.0.0',
    },
    // 注意：高并发场景下切勿将 workers 锁死为 1。注释掉或设为 CPU 核心数，充分利用多核性能
    // workers: 1,
  };
  
  // 核心 HTTP 服务器配置（防弱网环境超时断流）
  config.serverTimeout = 120000; // 整个请求的最长处理时间放宽到 120 秒 (针对低端安卓+极差网络)
  config.http = {
    keepAliveTimeout: 120000, // 保持 HTTP 长连接，避免海外节点频繁握手导致 ECONNRESET
    timeout: 120000,
    // 增加 headersTimeout，防止低端安卓在极差网络下发送 headers 过慢被直接掐断
    headersTimeout: 120000, 
  };

  // Gzip 数据压缩优化 (极大缓解中东弱网环境下的传输截断和超时)
  config.compress = {
    threshold: 1024, // 响应体大于 1KB 时开启压缩
    enable: true, // 全局开启
    match: /^\/api\//, // 只对 /api/ 开头的接口进行压缩
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
    // 增加底层连接参数，防止低端网络造成的包读取错误
    dialectOptions: {
      connectTimeout: 60000,
      // 禁用域名反查导致的阻塞问题 (针对 182.239.93.159.hk.chinamobile.com 警告)
      // 如果你的线上环境 Node.js 也是跑在 182.239.93.159 这台机器上，这里最好保持 127.0.0.1
    },
    // 防止高并发下 Prepared Statement 泄露导致 Can't create more than max_prepared_stmt_count statements 崩溃
    query: {
      typeCast: true,
    },
    define: {
      underscored: false,
      freezeTableName: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    // 增加连接池配置，防止高并发下连接被打满导致查询超时 (Telegram场景)
    pool: {
      max: 200, // 应对瞬间峰值，最大连接数提至 200
      min: 10,
      acquire: 60000, // 允许连接排队等待长达 60 秒 (防止直接抛出 TimeoutError)
      idle: 30000, // 放宽连接空闲释放时间（从 10秒 延长到 30秒，防止频繁重连导致 Aborted connection）
    },
    // 自动重试机制，针对 ECONNRESET 或死锁自动重试
    retry: {
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimeOutError/,
        /ECONNRESET/, // 专门对抗网络重置
        /Deadlock found when trying to get lock/, // 自动重试死锁
      ],
      max: 3, // 最大重试 3 次
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
  // 阿里云 ESA (CDN/WAF) 架构下的代理信任穿透
  // 请求链路: 用户 -> ESA节点 -> (可能经过防火墙层) -> 宝塔 Nginx -> Node.js
  // 如果这里只设为 1，Node.js 会把 ESA 节点的 IP 当作真实用户 IP，导致所有的 CN 拦截或防刷限制误杀海外用户
  config.maxProxyCount = 2; // 信任外层有 2 层代理 (ESA + Nginx)
  config.maxIpsCount = 2; // 从 X-Forwarded-For 中穿透 2 层取真实的客户端 IP
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
