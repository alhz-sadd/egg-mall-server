'use strict';

/**
 * 多语言响应处理中间件
 * 用于拦截移动端接口的响应并将其 message 进行多语言翻译
 * @return {Function} 中间件函数
 */
module.exports = () => {
  return async function i18nResponse(ctx, next) {
    // C端所有接口默认英文
    if (ctx.path.startsWith('/api/mobile/')) {
      const queryLocale = ctx.query.locale;
      const cookieLocale = ctx.cookies.get('locale');
      const headerLocale = ctx.get('accept-language');

      // 如果没有通过 query 或 cookie 明确指定语言
      if (!queryLocale && !cookieLocale) {
        // 如果 header 没有带，或者是默认带了中文（例如浏览器默认），强制使用英文
        if (!headerLocale || headerLocale.toLowerCase().includes('zh')) {
          ctx.locale = 'en-US';
        }
      }
    }

    await next();

    // 仅处理 /api/mobile/ 前缀的接口，翻译成功的响应
    if (ctx.path.startsWith('/api/mobile/') && ctx.body && typeof ctx.body === 'object' && ctx.body.message) {
      const msgKey = ctx.body.message;
      const translated = ctx.__(msgKey);
      ctx.body.message = translated || msgKey;
    }
  };
};
