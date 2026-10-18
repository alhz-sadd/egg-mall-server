'use strict';

/**
 * 操作日志中间件
 * 自动记录管理端写操作日志
 * @return {Function} 中间件函数
 */
module.exports = () => {
  return async function operationLog(ctx, next) {
    const start = Date.now();
    let originalError = null;

    try {
      await next();
    } catch (err) {
      originalError = err; // 捕获后面的中间件或 Controller 抛出的异常
    }

    // 记录管理端和C端的写操作
    if (!ctx.service.sysLog.shouldLog(ctx.method, ctx.url)) {
      if (originalError) throw originalError; // 如果不需要记录日志，直接把错误向上抛出
      return;
    }

    try {
      const cost = Date.now() - start;
      const params = ctx.service.sysLog.filterSensitiveParams(
        ctx.service.sysLog.resolveRequestParams(ctx),
      );
      const { businessType, title } = ctx.service.sysLog.resolveBusinessType(ctx.method, ctx.url);
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

      // 状态判定逻辑：
      // 如果发生抛出异常 (originalError)，说明一定是失败的 (status=1)
      // 如果没有抛出异常，但响应体(ctx.body)的 code 存在且不等于 200，也说明是业务失败 (status=1)
      // 其他情况视为成功 (status=0)
      let isSuccess = false;
      if (!originalError) {
        if (ctx.body && ctx.body.code !== undefined) {
          isSuccess = ctx.body.code === 200;
        } else {
          isSuccess = ctx.status >= 200 && ctx.status < 400;
        }
      }

      // 获取错误信息：如果是异常则取异常信息，如果是业务失败(code!=200)则取 body.message
      let errMsg = null;
      if (originalError) {
        errMsg = originalError.message;
      } else if (!isSuccess && ctx.body) {
        errMsg = ctx.body.message;
      }

      // 所有操作日志统一记录到 sys_oper_log 表
      // 采用 ctx.runInBackground 异步执行，不阻塞主流程的接口响应
      ctx.runInBackground(async () => {
        try {
          await ctx.service.sysLog.recordOperationLog({
            userId: operId,
            username: operName,
            title: businessTypeInfo.title,
            businessType: businessTypeInfo.businessType,
            operUrl: ctx.url,
            requestMethod: ctx.method,
            operParam: params,
            jsonResult: ctx.body || (originalError ? { error: originalError.message } : {}), // 如果有错误，把错误信息记下来
            operIp: ip,
            operLocation: location,
            device_type: parsedUa.deviceType,
            browser: parsedUa.browser,
            os: parsedUa.os,
            status: isSuccess ? 0 : 1, // 0=正常, 1=异常
            errorMsg: errMsg,
            costTime: cost,
            // 可以在 oper_desc 里追加标识，方便调试
            oper_desc: `${businessTypeInfo.title} - ${ctx.method}`,
          });
        } catch (innerErr) {
          ctx.logger.error('[operationLog] 异步记录操作日志失败：', innerErr.message);
        }
      });
    } catch (err) {
      ctx.logger.error('[operationLog] 记录操作日志失败：', err.message);
    }

    // 记完日志后，如果之前有捕获到业务抛出的异常，必须重新抛出去交给 error_handler 去处理
    if (originalError) {
      throw originalError;
    }
  };
};
