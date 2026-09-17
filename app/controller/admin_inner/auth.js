'use strict';

const CommonAuthController = require('../common/auth');

class AuthController extends CommonAuthController {
  async login() {
    await this.commonLogin(this.service.adminInnerUser, false);
  }

  async logout() {
    await this.commonLogout();
  }

  async current() {
    const { ctx } = this;
    const adminInner = await ctx.model.SysUser.findByPk(ctx.state.adminInner.adminInnerId, {
      attributes: { exclude: [ 'password' ] },
    });
    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        ...ctx.state.adminInner,
        isBindGoogle: !!adminInner.totp_secret,
        nickname: adminInner.nickname,
        phone: adminInner.phone,
        email: adminInner.email,
        gender: adminInner.gender,
      },
    };
  }

  /**
   * 修改当前账号个人资料
   */
  async updateProfile() {
    const { nickname, phone, email, gender } = this.ctx.request.body;
    await this.commonUpdateProfile(this.ctx.state.adminInner.adminInnerId, { nickname, phone, email, gender });
  }

  /**
   * 修改当前账号登录密码
   */
  async updatePwd() {
    await this.commonUpdatePwd(this.ctx.state.adminInner.adminInnerId);
  }

  /**
   * 重置当前账号谷歌验证码 (强制清空)
   */
  async resetGoogle() {
    await this.commonResetGoogle(this.ctx.state.adminInner.adminInnerId);
  }

  /**
   * 自行解绑谷歌验证码
   */
  async unbindGoogle() {
    await this.commonUnbindGoogle(this.ctx.state.adminInner.adminInnerId);
  }

  /**
   * 绑定前置：验证密码 (重写以传入允许的 user_type)
   */
  async verifyPasswordForBind() {
    await super.verifyPasswordForBind([ 1 ]);
  }

  /**
   * 给其他用户重置密码 (A端管理员操作)
   */
  async resetUserPwd() {
    const { ctx } = this;
    const { userId } = ctx.request.body;
    ctx.assert(userId, 422, '需要被修改的用户ID不能为空');
    
    // A端可以修改 店长(2), 业务员(3), 用户(4)
    const targetUser = await ctx.model.SysUser.findByPk(userId);
    ctx.assert(targetUser, 404, '目标用户不存在');
    ctx.assert([2, 3, 4].includes(targetUser.user_type), 403, '无权修改该类型用户的密码');

    await this.commonResetUserPwd(userId);
  }

  /**
   * 给其他用户重置谷歌验证码 (A端管理员操作)
   */
  async resetUserGoogle() {
    const { ctx } = this;
    const { userId } = ctx.request.body;
    ctx.assert(userId, 422, '需要被重置的用户ID不能为空');

    // A端可以重置 店长(2), 业务员(3)。用户(4)没有谷歌验证
    const targetUser = await ctx.model.SysUser.findByPk(userId);
    ctx.assert(targetUser, 404, '目标用户不存在');
    ctx.assert([2, 3].includes(targetUser.user_type), 403, '无权或无需重置该类型用户的谷歌验证码');

    await this.commonResetUserGoogle(userId);
  }

  /**
   * 登录第二步验证 (重写以传入对应的 service)
   */
  async loginVerify() {
    await super.loginVerify(this.service.adminInnerUser, false);
  }

  /**
   * TEMPORARY: Get JWT Secret (REMOVE AFTER USE)
   */
  async getJwtSecret() {
    const { ctx } = this;
    ctx.body = {
      code: 200,
      message: '获取成功',
      data: ctx.app.config.jwt.secret,
    };
  }
}

module.exports = AuthController;
