'use strict';

/**
 * 多语言响应处理中间件
 * 用于拦截移动端接口的响应并将其 message 进行多语言翻译
 * @return {Function} 中间件函数
 */
module.exports = () => {
  return async function i18nResponse(ctx, next) {
    await next();

    // 仅处理 /api/mobile/ 前缀的接口，翻译成功的响应
    if (ctx.path.startsWith('/api/mobile/') && ctx.body && typeof ctx.body === 'object' && ctx.body.message) {
      const msgKey = ctx.body.message;
      const translated = ctx.__(msgKey);
      ctx.body.message = translated || msgKey;
    }
  };
};
