'use strict';

/**
 * 全局错误处理中间件
 * 统一返回 { code, message, data } 格式的响应
 * @return {Function} 中间件函数
 */
module.exports = () => {
  return async function errorHandler(ctx, next) {
    // 全局禁用 API 请求的 TG 缓存
    if (ctx.path.startsWith('/api/')) {
      ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      ctx.set('Pragma', 'no-cache');
      ctx.set('Expires', '0');
    }

    try {
      await next();

      // 全局拦截 ctx.body 进行 BigInt 清洗，彻底防止因任何遗漏的 BigInt 字段导致 JSON 序列化 500 崩溃
      if (ctx.body && typeof ctx.body === 'object') {
        try {
          ctx.body = JSON.parse(JSON.stringify(ctx.body, (key, value) =>
            (typeof value === 'bigint' ? value.toString() : value),
          ));
        } catch (e) {
          ctx.logger.error(`[ErrorHandler] 全局 BigInt 清洗失败 - URL: ${ctx.url}, UserID: ${ctx.state.user ? (ctx.state.user.id || ctx.state.user.user_id) : '未登录'}, Error: ${e.message}`);
        }
      }

      // 处理未匹配到的路由 (404 Not Found)
      if (ctx.status === 404 && !ctx.body) {
        // 先走一遍多语言翻译，如果没匹配到则使用默认值
        let notFoundMsg = 'Not Found';
        let currentLang = 'en-US';
        if (ctx.locale) {
          currentLang = ctx.locale;
        } else {
          const headerLang = ctx.get('lang') || ctx.get('language') || ctx.get('accept-language');
          if (headerLang) {
            const match = headerLang.match(/[a-zA-Z]{2,3}-[a-zA-Z]{2,3}/);
            if (match) {
              const parts = match[0].split('-');
              currentLang = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
            } else if (headerLang.toLowerCase().includes('zh')) {
              currentLang = 'zh-CN';
            }
          }
        }
        try {
          const dict = require(`../../config/locale/${currentLang}.js`);
          notFoundMsg = dict['common.not_found'] || notFoundMsg;
        } catch (e) {
          // ignore
        }

        const isMobile = ctx.path.startsWith('/api/mobile');
        ctx.status = isMobile ? 200 : 404;

        // 强制禁用错误响应的缓存，防止 TG 缓存 404/401 导致前端后续请求直接命中缓存失败
        ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        ctx.set('Pragma', 'no-cache');
        ctx.set('Expires', '0');

        ctx.body = {
          code: isMobile ? 200 : 404,
          message: notFoundMsg,
          data: null,
        };

        // 为了方便排查，当发生 404 时，在后端日志中打印一条 WARN
        ctx.logger.warn(`[404 未找到路由] ${ctx.method} ${ctx.url} - (H5已返回200)`);

        return;
      }
    } catch (err) {
      let status = err.status || 500;
      let code = err.code || status;
      let message = err.message || 'common.server_error';

      // 强制禁用错误响应的缓存，防止 TG 缓存 404/401 导致前端后续请求直接命中缓存失败
      ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      ctx.set('Pragma', 'no-cache');
      ctx.set('Expires', '0');

      // 针对获取不到数据/白屏的痛点埋点：记录详细的请求参数、Header和响应错误
      const isMobile = ctx.path.startsWith('/api/mobile');
      const userId = ctx.state.user ? (ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId) : '未登录';

      if (status >= 500) {
        // 如果是 PayloadTooLargeError（数据截断/传输中断）或者 aborted，增加专门的断流埋点
        if (err.name === 'PayloadTooLargeError' || err.status === 413 || err.code === 'ECONNRESET') {
          ctx.logger.error(`[传输中断埋点] 状态码: ${status} | URL: ${ctx.method} ${ctx.url} | UserID: ${userId} | Error: ${err.message} | 客户端可能过早断开了连接或数据被截断`);
        } else {
          ctx.logger.error(`[致命异常埋点] 状态码: ${status} | URL: ${ctx.method} ${ctx.url} | UserID: ${userId} | Error: ${err.message} | User-Agent: ${ctx.get('user-agent')} | IP: ${ctx.ip}`);
        }
        // 记录错误日志，并保留堆栈信息
        ctx.app.emit('error', err, ctx);
      } else {
        // 400 级别的业务拦截（如任务不存在、余额不足），降级为普通的 WARN，避免污染 common-error.log
        // 增加埋点信息
        ctx.logger.warn(`[业务拦截埋点 ${status}] URL: ${ctx.method} ${ctx.url} | UserID: ${userId} | 拦截原因: ${message} | IP: ${ctx.ip}`);
      }

      // 处理参数校验类错误（如 egg-validate 抛出的错误）
      if (err.name === 'ValidationError') {
        status = 422;
        code = 422;
        // 如果想让多语言插件生效，可以把这部分提取出来，这里为了简化先原样返回
        message = `参数校验失败：${err.message}`;
      }

      // 处理 JWT 认证错误
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        status = 401;
        code = 401;
        message = err.name === 'TokenExpiredError' ? '登录已过期，请重新登录' : '登录凭证无效';
      }

      // 处理 Sequelize 唯一约束冲突
      if (err.name === 'SequelizeUniqueConstraintError') {
        status = 409;
        code = 409;
        message = '数据已存在，请勿重复提交';
      }

      // 进行多语言翻译 (移动端和管理端都可以统一处理)

      // 获取当前语言 (默认英文)
      let currentLang = 'en-US';
      if (ctx.locale) {
        currentLang = ctx.locale;
      } else {
        const headerLang = ctx.get('lang') || ctx.get('language') || ctx.get('accept-language');
        if (headerLang) {
          const match = headerLang.match(/[a-zA-Z]{2,3}-[a-zA-Z]{2,3}/);
          if (match) {
            const parts = match[0].split('-');
            currentLang = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
          } else if (headerLang.toLowerCase().includes('zh')) {
            currentLang = 'zh-CN';
          }
        }
      }

      // 动态加载字典，兜底使用 en-US
      let dict;
      try {
        dict = require(`../../config/locale/${currentLang}.js`);
      } catch (e) {
        dict = require('../../config/locale/en-US.js');
      }
      const fallbackDict = require('../../config/locale/en-US.js');

      // 手动翻译
      let translated = dict[message];

      // 如果没翻译出来（比如字典里没有这个key），尝试用 en-US 兜底
      if (!translated) {
        translated = fallbackDict[message] || message;
      }

      // 处理带前缀的参数校验错误
      if (translated === message && message.startsWith('参数校验失败：')) {
        const detail = message.replace('参数校验失败：', '');
        const paramErrorTpl = dict['common.param_error'] || '参数校验失败：%{msg}';
        translated = paramErrorTpl.replace('%{msg}', detail);
      }

      message = translated;

      // 开发环境可返回详细堆栈
      const detailed = ctx.app.config.errorHandler && ctx.app.config.errorHandler.detailed;
      const body = {
        code,
        message,
        data: null,
      };
      if (detailed && status === 500) {
        body.stack = err.stack;
      }

      const isMobileError = ctx.path.startsWith('/api/mobile');

      // 针对移动端 404 错误（如用户不存在、任务不存在等），强制转换 code 为 200 并返回 data: null
      // 避免触发前端 Axios 全局异常拦截器导致页面其他接口被中断、页面崩溃
      if (isMobileError && status === 404) {
        code = 200;
        body.code = 200;
      }

      // 手机端的接口统一 HTTP 200 返回，业务错误码由 body.code 区分
      if (isMobileError) {
        ctx.status = 200;
      } else {
        ctx.status = status;
      }

      ctx.body = body;
    }
  };
};
