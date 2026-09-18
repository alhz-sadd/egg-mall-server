'use strict';

const Controller = require('egg').Controller;

class CommonAuthController extends Controller {
  /**
   * 统一登录逻辑
   * @param {Object} userService 对应的用户服务 (adminInnerUser 或 adminOuterUser)
   * @param {boolean} formatData 是否格式化返回数据 (如 B端映射 token 字段)
   */
  async commonLogin(userService, formatData = false) {
    const { ctx } = this;
    const meta = {
      ip: ctx.ip,
      userAgent: ctx.get('user-agent'),
      device: 1, // 默认PC
      browser: '未知',
      os: '未知',
    };
    
    const result = await userService.login(ctx.request.body, meta);
    
    if (result.need_totp) {
      ctx.status = 422; // 确保 HTTP 状态码也是 422
      ctx.body = {
        code: 422,
        message: '需要进行谷歌验证',
        data: result,
      };
      return;
    }

    ctx.body = {
      code: 200,
      message: '登录成功',
      data: formatData ? {
        token: result.accessToken,
        refreshToken: result.refreshToken,
      } : result,
    };
  }

  /**
   * 统一退出登录
   */
  async commonLogout() {
    const { ctx } = this;
    ctx.body = {
      code: 200,
      message: '退出成功',
      data: null,
    };
  }

  /**
   * 统一刷新 Token
   * （挂载在公共路由中供前端调用）
   */
  async refresh() {
    const { ctx, app } = this;
    const { refreshToken } = ctx.request.body;

    if (!refreshToken) {
      ctx.throw(401, '缺少 refreshToken');
    }

    try {
      const decoded = app.jwt.verify(refreshToken, app.config.jwt.secret);
      if (!decoded.isRefresh) {
        ctx.throw(401, '无效的 refreshToken');
      }

      // 签发新的 accessToken
      const payload = { ...decoded };
      delete payload.isRefresh;
      delete payload.iat;
      delete payload.exp;
      
      const newAccessToken = app.jwt.sign(
        payload,
        app.config.jwt.secret,
        { expiresIn: app.config.jwt.expiresIn },
      );

      // 签发新的 refreshToken，实现无感刷新/会话顺延
      const newRefreshToken = app.jwt.sign(
        { ...payload, isRefresh: true },
        app.config.jwt.secret,
        { expiresIn: app.config.jwt.refreshExpiresIn },
      );

      ctx.body = {
        code: 200,
        message: '刷新成功',
        data: {
          token: newAccessToken, // 兼容 B端
          accessToken: newAccessToken, // 兼容 C端
          refreshToken: newRefreshToken, // 返回新的 refreshToken
        },
      };
    } catch (err) {
      ctx.throw(401, 'refreshToken 已过期或无效');
    }
  }

  /**
   * 统一修改个人资料
   * @param {number} userId 用户ID
   * @param {Object} updateData 需要更新的资料 (自动过滤 undefined)
   */
  async commonUpdateProfile(userId, updateData) {
    const { ctx } = this;
    const user = await ctx.model.SysUser.findByPk(userId);
    ctx.assert(user, 401, '账号不存在');

    const finalData = {};
    for (const key in updateData) {
      if (updateData[key] !== undefined) {
        finalData[key] = updateData[key];
      }
    }

    await user.update(finalData);

    ctx.body = {
      code: 200,
      message: '修改个人资料成功',
      data: null,
    };
  }

  /**
   * 统一修改密码
   * @param {number} userId 用户ID
   */
  async commonUpdatePwd(userId) {
    const { ctx } = this;
    const { oldPassword, newPassword, confirmPassword } = ctx.request.body;

    ctx.assert(oldPassword, 422, '旧密码不能为空');
    ctx.assert(newPassword, 422, '新密码不能为空');
    ctx.assert(confirmPassword, 422, '确认密码不能为空');

    if (newPassword !== confirmPassword) {
      ctx.throw(422, '两次输入的新密码不一致');
    }

    const user = await ctx.model.SysUser.findByPk(userId);
    ctx.assert(user, 401, '账号不存在');

    const match = await ctx.compare(oldPassword, user.password);
    if (!match) {
      ctx.throw(422, '旧密码错误');
    }

    const hashedPassword = await ctx.genHash(newPassword);
    await user.update({ password: hashedPassword });

    ctx.body = {
      code: 200,
      message: '密码修改成功',
      data: null,
    };
  }

  /**
   * 统一重置谷歌验证码器
   * @param {number} userId 用户ID
   */
  async commonResetGoogle(userId) {
    const { ctx } = this;
    const user = await ctx.model.SysUser.findByPk(userId);
    ctx.assert(user, 401, '账号不存在');

    await user.update({ totp_secret: null, totp_enable: 0 });

    ctx.body = {
      code: 200,
      message: '谷歌验证码重置成功',
      data: null,
    };
  }

  /**
   * 统一解绑谷歌验证码 (用户自行解绑)
   * 验证当前登录密码和动态谷歌验证码后，清空绑定状态
   * @param {number} userId 用户ID
   */
  async commonUnbindGoogle(userId) {
    const { ctx, service } = this;
    const { password, code } = ctx.request.body;

    ctx.assert(password, 422, '登录密码不能为空');
    ctx.assert(code, 422, '谷歌验证码不能为空');

    const user = await ctx.model.SysUser.findByPk(userId);
    ctx.assert(user, 401, '账号不存在');
    ctx.assert(user.totp_enable === 1, 422, '未绑定谷歌验证码，无需解绑');

    // 1. 验证密码
    const match = await ctx.compare(password, user.password);
    if (!match) {
      ctx.throw(422, '登录密码错误');
    }

    // 2. 验证谷歌验证码
    // 直接使用 totp_secret 和 speakeasy 校验，不支持恢复码解绑（为了安全）
    const decryptedSecret = service.totp.decrypt(user.totp_secret);
    const speakeasy = require('speakeasy');
    const isCodeValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: code,
      window: 1, // 允许一定时间误差
    });

    if (!isCodeValid) {
      ctx.throw(422, '谷歌验证码错误或已失效');
    }

    // 3. 校验通过，清空绑定
    await user.update({
      totp_secret: null,
      totp_enable: 0,
      totp_recovery_codes: null,
    });

    ctx.body = {
      code: 200,
      message: '解绑谷歌验证码成功',
      data: null,
    };
  }

  /**
   * 统一给其他用户修改密码 (管理员/上级操作)
   * @param {number} targetUserId 被修改用户的ID
   */
  async commonResetUserPwd(targetUserId) {
    const { ctx } = this;
    const { newPassword } = ctx.request.body;

    ctx.assert(newPassword, 422, '新密码不能为空');

    const targetUser = await ctx.model.SysUser.findByPk(targetUserId);
    ctx.assert(targetUser, 404, '目标用户不存在');

    const hashedPassword = await ctx.genHash(newPassword);
    await targetUser.update({ password: hashedPassword });

    ctx.body = {
      code: 200,
      message: '用户密码重置成功',
      data: null,
    };
  }

  /**
   * 统一给其他用户重置谷歌验证码 (管理员/上级操作)
   * @param {number} targetUserId 被重置用户的ID
   */
  async commonResetUserGoogle(targetUserId) {
    const { ctx } = this;
    const targetUser = await ctx.model.SysUser.findByPk(targetUserId);
    ctx.assert(targetUser, 404, '目标用户不存在');

    await targetUser.update({
      totp_secret: null,
      totp_enable: 0,
      totp_recovery_codes: null,
    });

    ctx.body = {
      code: 200,
      message: '用户谷歌验证码重置成功',
      data: null,
    };
  }

  /**
   * 绑定前置：验证密码

   * @param {number[]} allowedUserTypes 允许的用户类型
   */
  async verifyPasswordForBind(allowedUserTypes) {
    const { ctx, service } = this;
    const { username, password } = ctx.request.body;
    ctx.assert(username, 422, '账号不能为空');
    ctx.assert(password, 422, '密码不能为空');

    const user = await ctx.model.SysUser.findOne({
      where: {
        username,
        user_type: { [ctx.model.Sequelize.Op.in]: allowedUserTypes },
        is_deleted: 0,
      },
    });
    ctx.assert(user, 422, '账号不存在或类型不匹配');

    const data = await service.totp.verifyPasswordForBind(user.user_id, password);
    ctx.body = {
      code: 200,
      message: '密码验证成功，可获取二维码',
      data,
    };
  }

  /**
   * 获取绑定二维码
   */
  async bindInit() {
    const { ctx, service } = this;
    const { bindToken } = ctx.request.body;
    ctx.assert(bindToken, 422, '绑定凭证(bindToken)不能为空');

    const data = await service.totp.bindInit(bindToken);
    ctx.body = {
      code: 200,
      message: '获取二维码成功',
      data,
    };
  }

  /**
   * 确认绑定
   */
  async bindConfirm() {
    const { ctx, service } = this;
    const { bindToken, code } = ctx.request.body;
    ctx.assert(bindToken, 422, '绑定凭证(bindToken)不能为空');
    ctx.assert(code, 422, '验证码不能为空');

    const data = await service.totp.bindConfirm(bindToken, code);
    ctx.body = {
      code: 200,
      message: '绑定成功，请妥善保存恢复码',
      data,
    };
  }

  /**
   * 登录第二步验证
   * @param {Object} userService 对应的用户服务 (adminInnerUser 或 adminOuterUser)
   * @param {boolean} formatData 是否格式化返回数据
   */
  async loginVerify(userService, formatData = false) {
    const { ctx, service } = this;
    const { userId, inputCode } = ctx.request.body;
    ctx.assert(userId, 422, '用户ID不能为空');
    ctx.assert(inputCode, 422, '验证码不能为空');

    await service.totp.loginVerify(userId, inputCode);
    const data = await userService.generateTokensAfterTotp(userId);

    ctx.body = {
      code: 200,
      message: '登录成功',
      data: formatData ? {
        token: data.accessToken,
        refreshToken: data.refreshToken,
      } : data,
    };
  }
}

module.exports = CommonAuthController;
