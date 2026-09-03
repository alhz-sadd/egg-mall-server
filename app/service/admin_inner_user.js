'use strict';

const Service = require('egg').Service;

class AdminInnerUserService extends Service {
  async login(payload) {
    const { ctx } = this;
    const { username, password, googleCode } = payload;

    ctx.assert(username, 422, '账号不能为空');
    ctx.assert(password, 422, '密码不能为空');

    const adminInner = await ctx.model.AdminInnerUser.findOne({ where: { username } });
    if (!adminInner) {
      ctx.throw(422, '账号或密码错误');
    }

    if (adminInner.status !== 1) {
      ctx.throw(422, '账号已被禁用');
    }

    const match = await ctx.compare(password, adminInner.password);
    if (!match) {
      ctx.throw(422, '账号或密码错误');
    }

    if (adminInner.google_code) {
      ctx.assert(googleCode, 422, '谷歌验证码不能为空');

      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: adminInner.google_code,
        encoding: 'base32',
        token: googleCode,
        window: 1,
      });

      if (!verified) {
        ctx.throw(422, '谷歌验证码错误');
      }
    }

    const accessToken = ctx.app.jwt.sign(
      { adminInnerId: adminInner.id, username: adminInner.username, type: 'admin_inner' },
      ctx.app.config.jwt.secret,
      { expiresIn: ctx.app.config.jwt.expiresIn },
    );

    const refreshToken = ctx.app.jwt.sign(
      { adminInnerId: adminInner.id, type: 'admin_inner', isRefresh: true },
      ctx.app.config.jwt.secret,
      { expiresIn: ctx.app.config.jwt.refreshExpiresIn },
    );

    return { accessToken, refreshToken };
  }
}

module.exports = AdminInnerUserService;
