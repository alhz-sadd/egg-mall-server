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

      // 2. 处理跨域头 (移除这里与 egg-cors 冲突的手动 CORS 设置，避免产生重复头导致浏览器拦截)
      // 注意：egg-cors 插件已经在全局生效，此处重复设置会导致 Access-Control-Allow-Origin 出现两个值，从而在部分严格的浏览器（如 TG 内置 WebKit）中直接触发网络错误 (Network Error) 导致前端拿不到数据显示 --
      
      // 3. 处理 OPTIONS 预检请求 (交给 egg-cors 处理即可，避免中间件冲突)
    }

    await next();
  };
};
