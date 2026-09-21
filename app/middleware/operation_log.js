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
      const businessTypeInfo = { businessType, title };
      const parsedUa = ctx.service.sysLog.resolveUserAgent(ctx.request.header['user-agent']);

    const ip = ctx.ip || ctx.request.ip || '127.0.0.1';
    const location = await ctx.service.sysLog.resolveIpLocation(ip);

    // 获取操作人员信息
    let operId = 0;
    let operUserType = 0; // 0=未知, 1=A端管理员, 2=B端店长, 3=B端业务员, 4=C端普通用户
    let operName = '未知';
    let isAdminLog = false; // 是否属于管理端（A端/B端）日志
    let adminOperType = 1; // 1: A端, 2: B端

    // 先判断 C端 (Mobile) 的登录信息
    if (ctx.state.user) {
      operId = ctx.state.user.userId;
      operName = ctx.state.user.user_phone || String(operId);
      operUserType = 4;
    }
    // 再判断 B端
    else if (ctx.state.adminOuter) {
      operId = ctx.state.adminOuter.adminOuterId;
      operName = ctx.state.adminOuter.username || String(operId);
      operUserType = 2; // 可能是店长或业务员，统一先记为 2，如果有详细信息可细化
      isAdminLog = true;
      adminOperType = 2;
    }
    // 再判断 B端内部子账号 (admin_user)
    else if (ctx.state.admin) {
      operId = ctx.state.admin.adminId;
      operName = ctx.state.admin.username || String(operId);
      operUserType = ctx.state.admin.role || 2; // 根据 role 判断 (2=店长, 3=业务员)
      isAdminLog = true;
      adminOperType = 2;
    }
    // 最后判断 A端 (内端)
    else if (ctx.state.adminInner) {
      operId = ctx.state.adminInner.adminInnerId;
      operName = ctx.state.adminInner.username || String(operId);
      operUserType = 1;
      isAdminLog = true;
      adminOperType = 1;
    }

    // 判断请求路由来确定来源
    if (ctx.url.startsWith('/api/admin-inner/')) {
      isAdminLog = true;
      adminOperType = 1;
    } else if (ctx.url.startsWith('/api/admin-outer/')) {
      isAdminLog = true;
      adminOperType = 2;
    }

    // 所有操作日志统一记录到 sys_oper_log 表
    await ctx.service.sysLog.recordOperationLog({
      userId: operId,
      username: operName,
      title: businessTypeInfo.title,
      businessType: businessTypeInfo.businessType,
      operUrl: ctx.url,
      requestMethod: ctx.method,
      operParam: params,
      jsonResult: ctx.body,
      operIp: ip,
      operLocation: location,
      device_type: parsedUa.deviceType,
      browser: parsedUa.browser,
      os: parsedUa.os,
      status: ctx.status >= 200 && ctx.status < 400 ? 0 : 1,
      errorMsg: ctx.status >= 400 ? (ctx.body && ctx.body.message ? ctx.body.message : '请求异常') : null,
      costTime: cost,
      // 可以在 oper_desc 里追加标识，方便调试
      oper_desc: `${businessTypeInfo.title} - ${ctx.method}`,
    });
    } catch (err) {
      ctx.logger.error('[operationLog] 记录操作日志失败：', err.message);
    }
  };
};
