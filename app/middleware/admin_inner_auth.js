'use strict';

module.exports = () => {
  return async function adminInnerAuth(ctx, next) {
    const token = ctx.request.header.authorization;

    if (!token) {
      ctx.throw(401, '请先登录');
    }

    const tokenValue = token.replace(/^Bearer\s+/, '');
    try {
      const decoded = ctx.app.jwt.verify(tokenValue, ctx.app.config.jwt.secret);
      if (decoded.type !== 'admin_inner') {
        ctx.throw(401, '无效的 Token');
      }

      const adminInner = await ctx.model.SysUser.findByPk(decoded.adminInnerId);
      if (!adminInner || adminInner.user_type !== 1) {
        ctx.throw(401, '账号不存在或已被删除');
      }
      if (adminInner.status !== 1) {
        ctx.throw(401, '账号已被禁用');
      }

      ctx.state.adminInner = {
        adminInnerId: adminInner.user_id,
        username: adminInner.username,
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
