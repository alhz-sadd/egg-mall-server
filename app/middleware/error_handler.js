'use strict';

/**
 * 全局错误处理中间件
 * 统一返回 { code, message, data } 格式的响应
 * @return {Function} 中间件函数
 */
module.exports = () => {
  return async function errorHandler(ctx, next) {
    try {
      await next();
    } catch (err) {
      // 记录错误日志
      ctx.app.emit('error', err, ctx);

      // 默认错误状态码和响应码
      let status = err.status || 500;
      let code = err.code || status;
      let message = err.message || '服务器内部错误';

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

      ctx.status = 200;
      ctx.body = body;
    }
  };
};
