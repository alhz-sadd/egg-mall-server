'use strict';

/**
 * 操作日志中间件
 * 自动记录管理端写操作日志
 * @return {Function} 中间件函数
 */
module.exports = () => {
  return async function operationLog(ctx, next) {
    const start = Date.now();
    const { method, url, ip } = ctx;

    await next();

    // 记录管理端和C端的写操作
    if (!ctx.service.sysLog.shouldLog(method, url)) {
      return;
    }

    try {
      const cost = Date.now() - start;
      const admin = ctx.state.admin || ctx.state.adminInner || ctx.state.adminOuter || ctx.state.user || {};
      const params = ctx.service.sysLog.filterSensitiveParams(
        ctx.service.sysLog.resolveRequestParams(ctx),
      );
      const { businessType, title } = ctx.service.sysLog.resolveBusinessType(method, url);

      await ctx.service.sysLog.recordOperationLog({
        userId: admin.adminInnerId || admin.adminOuterId || admin.adminId || admin.user_id || admin.userId || null,
        username: admin.username || admin.account || null,
        title,
        businessType,
        operUrl: url,
        requestMethod: method,
        operParam: params,
        jsonResult: ctx.body,
        operIp: ip || null,
        operLocation: ctx.service.sysLog.resolveIpLocation(ip),
        status: ctx.status >= 200 && ctx.status < 400 ? 0 : 1,
        errorMsg: ctx.status >= 400 ? (ctx.body && ctx.body.message) : null,
        costTime: cost,
      });
    } catch (err) {
      ctx.logger.error('[operationLog] 记录操作日志失败：', err.message);
    }
  };
};
