'use strict';

const geoip = require('geoip-lite');

module.exports = () => {
  return async function blockCn(ctx, next) {
    // 允许内部接口、管理后台、测试接口等跳过此检查（可选）
    // 如果想要全局除了中国都能访问，则不需要跳过

    // 获取客户端真实 IP
    const ip = ctx.ip || ctx.request.ip || ctx.ips[0];

    // 开发环境本地调试时放行本地 IP
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      return await next();
    }

    // 根据 IP 获取地理位置信息
    const geo = geoip.lookup(ip);

    // geo 对象的 country 属性是 ISO 3166-1 alpha-2 两位国家代码，如 'CN' 表示中国
    if (geo && geo.country === 'CN') {
      ctx.logger.warn(`[地区拦截] 拦截来自中国大陆的访问请求 IP: ${ip}, URL: ${ctx.url}`);
      ctx.status = 403;
      ctx.body = {
        code: 403,
        message: 'Access denied in your region.',
      };
      return; // 终止请求继续向下执行
    }

    // 非中国大陆地区，放行
    await next();
  };
};
