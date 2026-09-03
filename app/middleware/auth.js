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
      ctx.throw(401, '缺少登录凭证');
    }

    const parts = authorization.trim().split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      ctx.throw(401, '登录凭证格式错误');
    }

    const token = parts[1];
    if (!token) {
      ctx.throw(401, '登录凭证为空');
    }

    try {
      // 校验 token，并将解析结果挂载到 ctx.state.user
      const decoded = ctx.app.jwt.verify(token, ctx.app.config.jwt.secret);
      ctx.state.user = decoded;
    } catch (err) {
      ctx.throw(401, err.message);
    }

    await next();
  };
};
