'use strict';

const Controller = require('egg').Controller;

class AuthController extends Controller {
  /**
   * 刷新 Token
   * 适用于移动端和管理端
   */
  async refresh() {
    const { ctx, app } = this;
    const { refreshToken } = ctx.request.body;

    if (!refreshToken) {
      ctx.throw(401, '刷新令牌不能为空');
    }

    try {
      // 1. 校验 Refresh Token
      const decoded = app.jwt.verify(refreshToken, app.config.jwt.secret);

      // 2. 校验是否为专门的刷新令牌
      if (!decoded.isRefresh) {
        ctx.throw(401, '无效的刷新令牌');
      }

      let accessToken;
      let newRefreshToken;

      // 3. 根据类型生成新的双 Token
      if (decoded.type === 'admin') {
        // 管理端刷新
        const admin = await ctx.model.AdminUser.findByPk(decoded.adminId);
        if (!admin || admin.status !== 1) {
          ctx.throw(401, '管理员账号不存在或已禁用');
        }

        accessToken = app.jwt.sign(
          { adminId: admin.id, role: admin.role, username: admin.username, type: 'admin' },
          app.config.jwt.secret,
          { expiresIn: app.config.jwt.expiresIn },
        );

        newRefreshToken = app.jwt.sign(
          { adminId: admin.id, type: 'admin', isRefresh: true },
          app.config.jwt.secret,
          { expiresIn: app.config.jwt.refreshExpiresIn },
        );
      } else if (decoded.type === 'admin_inner') {
        // 内部系统刷新
        const adminInner = await ctx.model.SysUser.findByPk(decoded.adminInnerId);
        if (!adminInner || adminInner.status !== 1 || adminInner.user_type !== 1) {
          ctx.throw(401, '内部管理员账号不存在或已禁用');
        }

        accessToken = app.jwt.sign(
          { adminInnerId: adminInner.user_id, username: adminInner.username, type: 'admin_inner' },
          app.config.jwt.secret,
          { expiresIn: app.config.jwt.expiresIn },
        );

        newRefreshToken = app.jwt.sign(
          { adminInnerId: adminInner.user_id, type: 'admin_inner', isRefresh: true },
          app.config.jwt.secret,
          { expiresIn: app.config.jwt.refreshExpiresIn },
        );
      } else {
        // 移动端用户刷新
        const user = await ctx.model.SysUser.findByPk(decoded.userId);
        if (!user || user.status !== 1) {
          ctx.throw(401, '用户账号不存在或已禁用');
        }

        accessToken = app.jwt.sign(
          { userId: user.user_id, user_phone: user.username, type: 'user' },
          app.config.jwt.secret,
          { expiresIn: app.config.jwt.expiresIn },
        );

        newRefreshToken = app.jwt.sign(
          { userId: user.user_id, type: 'user', isRefresh: true },
          app.config.jwt.secret,
          { expiresIn: app.config.jwt.refreshExpiresIn },
        );
      }

      ctx.body = {
        code: 200,
        message: '刷新成功',
        data: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      };
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        ctx.throw(401, '登录凭证已过期，请重新登录');
      }
      ctx.throw(401, '登录凭证无效');
    }
  }
}

module.exports = AuthController;
