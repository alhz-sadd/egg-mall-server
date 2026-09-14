'use strict';

module.exports = () => {
  return async function adminOuterAuth(ctx, next) {
    const token = ctx.request.header.authorization;

    if (!token) {
      ctx.throw(401, '请先登录');
    }

    const tokenValue = token.replace(/^Bearer\s+/, '');
    try {
      const decoded = ctx.app.jwt.verify(tokenValue, ctx.app.config.jwt.secret);
      if (decoded.type !== 'admin_outer') {
        ctx.throw(401, '无效的 Token');
      }

      const adminOuter = await ctx.model.SysUser.findByPk(decoded.adminOuterId);
      if (!adminOuter || ![ 2, 3 ].includes(adminOuter.user_type)) {
        ctx.throw(401, '账号不存在或已被删除');
      }
      if (adminOuter.status !== 1) {
        ctx.throw(401, '账号已被禁用');
      }

      ctx.state.adminOuter = {
        adminOuterId: adminOuter.user_id,
        user_id: adminOuter.user_id,
        username: adminOuter.username,
        role_id: adminOuter.role_id,
        user_type: adminOuter.user_type,
        shop_id: adminOuter.shop_id,
      };

      await next();
    } catch (err) {
      // 只有在 JWT 解析失败，或者是我们主动抛出的 401 时才处理
      // 否则将其他业务代码里 throw 的错误 (如 422) 原样向上抛出
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        ctx.throw(401, err.name === 'TokenExpiredError' ? '登录已过期，请重新登录' : '无效的 Token');
      }
      if (err.status === 401) {
        ctx.throw(401, err.message);
      }
      // 其他错误（如 422 账号已存在）直接抛出
      throw err;
    }
  };
};
