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
        // 先检查自定义的 lang 或 language header
        const customLang = ctx.get('lang') || ctx.get('language');
        if (customLang) {
          ctx.locale = customLang;
        } else if (headerLocale) {
          const match = headerLocale.match(/[a-zA-Z]{2,3}-[a-zA-Z]{2,3}/);
          if (match) {
            const parts = match[0].split('-');
            ctx.locale = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
          } else if (headerLocale.toLowerCase().includes('zh')) {
            ctx.locale = 'zh-CN';
          } else {
            ctx.locale = 'en-US';
          }
        } else {
          ctx.locale = 'en-US';
        }
      }
    }

    await next();

    // 仅处理 /api/mobile/ 前缀的接口，翻译成功的响应
    if (ctx.path.startsWith('/api/mobile/') && ctx.body && typeof ctx.body === 'object' && ctx.body.message) {
      const msgKey = ctx.body.message;

      let dict;
      try {
        dict = require(`../../config/locale/${ctx.locale}.js`);
      } catch (e) {
        dict = require('../../config/locale/en-US.js');
      }
      const fallbackDict = require('../../config/locale/en-US.js');

      let translated = dict[msgKey];

      if (!translated) {
        translated = fallbackDict[msgKey] || msgKey;
      }

      ctx.body.message = translated;
    }
  };
};
