'use strict';

/**
 * 移动端/C端 强制防缓存与跨域放行中间件
 * 专门针对中东等海外地区网络代理、特定浏览器（如 TG 内置浏览器）对请求的激进缓存和拦截
 */
module.exports = () => {
  return async function mobileCorsAndNoCache(ctx, next) {
    // 仅针对移动端 (C端) 接口生效
    if (ctx.path.startsWith('/api/mobile/')) {
      // 1. 穿透海外网络代理的“死缓存”
      ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      ctx.set('Pragma', 'no-cache');
      ctx.set('Expires', '0');

      // 2. 增加宽容的跨域和请求头放行 (CORS)
      // 注意：不能使用 '*' 当请求携带 credentials (凭证/Token) 时，否则会被浏览器严格模式拦截
      const origin = ctx.request.get('Origin');
      if (origin) {
        ctx.set('Access-Control-Allow-Origin', origin);
      } else {
        ctx.set('Access-Control-Allow-Origin', '*');
      }
      ctx.set('Access-Control-Allow-Credentials', 'true');
      ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma, Expires, Accept-Language, language, lang, token, shop-id, tenant-id, referer, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform');
      ctx.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');

      // 3. 处理 OPTIONS 预检请求，直接返回 204
      if (ctx.method === 'OPTIONS') {
        ctx.status = 204;
        return;
      }
    }

    await next();
  };
};
