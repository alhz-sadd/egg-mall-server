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

    // 仅记录管理端写操作
    if (!ctx.service.operationLog.shouldLog(method, url)) {
      return;
    }

    try {
      const cost = Date.now() - start;
      const admin = ctx.state.admin || {};
      const params = ctx.service.operationLog.filterSensitiveParams(
        ctx.service.operationLog.resolveRequestParams(ctx),
      );
      const { businessType, title } = ctx.service.operationLog.resolveBusinessType(method, url);

      await ctx.service.operationLog.create({
        adminId: admin.adminId || null,
        username: admin.username || null,
        operName: admin.nickname || admin.username || null,
        operatorType: admin.role || null,
        title,
        businessType,
        operUrl: url,
        requestMethod: method,
        operParam: JSON.stringify(params),
        jsonResult: JSON.stringify(ctx.body),
        request: JSON.stringify({ query: ctx.query, body: ctx.request.body }),
        operIp: ip || null,
        operLocation: ctx.service.operationLog.resolveIpLocation(ip),
        costTime: cost,
        operTime: new Date(),
        status: ctx.status >= 200 && ctx.status < 400 ? 0 : 1,
        remark: null,
      });
    } catch (err) {
      ctx.logger.error('[operationLog] 记录操作日志失败：', err.message);
    }
  };
};
