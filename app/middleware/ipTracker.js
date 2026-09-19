'use strict';

module.exports = () => {
  return async function ipTracker(ctx, next) {
    // 把所有的请求头信息和解析出来的 IP 直接强制塞进日志里
    const ip = ctx.ip || ctx.request.ip;
    ctx.logger.error('=== IP TRACKER MIDDLEWARE ===');
    ctx.logger.error('Parsed IP:', ip);
    ctx.logger.error('Headers:', JSON.stringify(ctx.request.headers));
    ctx.logger.error('===========================');
    
    await next();
  };
};