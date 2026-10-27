'use strict';

/**
 * JWT 鉴权中间件
 * 从请求头 Authorization 中提取并校验 JWT Token
 * @return {Function} 中间件函数
 */
module.exports = () => {
  return async function auth(ctx, next) {
    const { authorization } = ctx.headers;

    if (!authorization) {
      ctx.throw(401, ctx.__('common.missing_credentials'));
    }

    const parts = authorization.trim().split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      ctx.throw(401, ctx.__('common.credentials_format_error'));
    }

    const token = parts[1];
    if (!token) {
      ctx.throw(401, ctx.__('common.credentials_empty'));
    }

    try {
      // 校验 token，并将解析结果挂载到 ctx.state.user
      const decoded = ctx.app.jwt.verify(token, ctx.app.config.jwt.secret);

      // 实时校验用户状态，如果被禁用则直接踢下线
      if (decoded.userId) {
        const user = await ctx.model.SysUser.findByPk(decoded.userId, {
          attributes: [ 'status', 'is_deleted' ],
        });
        if (!user || user.is_deleted === 1 || user.status !== 1) {
          ctx.throw(401, ctx.__('user.account_disabled') || '账号已被禁用');
        }
      }

      ctx.state.user = decoded;

      // 为了移动端接口（/api/mobile/），如果有shop_id，将其挂载到 ctx.state.shop_id
      if (decoded.shop_id) {
        ctx.state.shop_id = decoded.shop_id;
      }
    } catch (err) {
      ctx.throw(401, err.message || 'Token 验证失败');
    }

    await next();
  };
};
