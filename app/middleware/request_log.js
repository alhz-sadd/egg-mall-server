'use strict';

/**
 * 请求日志中间件
 * 记录每个请求的方法、URL、IP、状态码和耗时
 * @return {Function} 中间件函数
 */
module.exports = () => {
  return async function requestLog(ctx, next) {
    const start = Date.now();
    const { method, url, ip } = ctx;

    await next();

    const cost = Date.now() - start;
    const { status } = ctx;

    ctx.logger.info(`[request] ${method} ${url} - ${status} - ${ip} - ${cost}ms`);
  };
};
