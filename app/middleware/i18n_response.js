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
          // 修改匹配规则：兼容形如 zh-CN, ar-SA, fr-FR 等各种 2~3 位字母组合
          const match = headerLocale.match(/[a-zA-Z]{2,3}-[a-zA-Z]{2,3}/);
          if (match) {
            // 修复：不强制将后半部分大写，直接使用前端传过来的原始格式，或者只做基础校验
            // 因为有些语言包可能就是小写的，或者前端传的就是严格区分大小写的格式
            ctx.locale = match[0];
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

      // 防止极其特殊的恶意或不规范 locale 字符串导致文件路径穿越或 require 崩溃
      // 例如：用户的 TG 语言设置了某种极度罕见的标记，或者被注入了特殊字符
      let safeLocale = 'en-US';
      if (typeof ctx.locale === 'string' && /^[a-zA-Z0-9-]+$/.test(ctx.locale)) {
        safeLocale = ctx.locale;
      }

      let dict;
      try {
        dict = require(`../../config/locale/${safeLocale}.js`);
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
