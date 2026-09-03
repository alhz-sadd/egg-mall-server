'use strict';

/**
 * 管理系统角色权限中间件
 * 仅允许指定角色访问
 * @param {Array<number>} allowedRoles 允许的角色列表
 * @return {Function} 中间件函数
 */
module.exports = allowedRoles => {
  return async function adminRole(ctx, next) {
    const { admin } = ctx.state;
    if (!admin || !allowedRoles.includes(admin.role)) {
      ctx.throw(403, '当前角色无权访问该接口');
    }
    await next();
  };
};
