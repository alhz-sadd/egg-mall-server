'use strict';

const Controller = require('egg').Controller;

class AuthController extends Controller {
  async login() {
    const { ctx, service } = this;
    const result = await service.adminInnerUser.login(ctx.request.body);
    ctx.body = {
      code: 200,
      message: '登录成功',
      data: result,
    };
  }

  async logout() {
    const { ctx } = this;
    ctx.body = {
      code: 200,
      message: '退出成功',
      data: null,
    };
  }

  async current() {
    const { ctx } = this;
    const adminInner = await ctx.model.AdminInnerUser.findByPk(ctx.state.adminInner.adminInnerId, {
      attributes: { exclude: [ 'password' ] },
    });
    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        ...ctx.state.adminInner,
        isBindGoogle: !!adminInner.google_code,
        nickname: adminInner.nickname,
        phone: adminInner.phone,
        email: adminInner.email,
        gender: adminInner.gender,
        remark: adminInner.remark,
      },
    };
  }

  /**
   * 修改当前账号个人资料
   */
  async updateProfile() {
    const { ctx } = this;
    const adminInnerId = ctx.state.adminInner.adminInnerId;
    const { nickname, phone, email, gender, remark } = ctx.request.body;

    const adminInner = await ctx.model.AdminInnerUser.findByPk(adminInnerId);
    ctx.assert(adminInner, 401, '账号不存在');

    const updateData = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (gender !== undefined) updateData.gender = Number(gender);
    if (remark !== undefined) updateData.remark = remark;

    await adminInner.update(updateData);

    ctx.body = {
      code: 200,
      message: '修改个人资料成功',
      data: null,
    };
  }

  /**
   * 修改当前账号登录密码
   */
  async updatePwd() {
    const { ctx } = this;
    const adminInnerId = ctx.state.adminInner.adminInnerId;
    const { oldPassword, newPassword, confirmPassword } = ctx.request.body;

    ctx.assert(oldPassword, 422, '旧密码不能为空');
    ctx.assert(newPassword, 422, '新密码不能为空');
    ctx.assert(confirmPassword, 422, '确认密码不能为空');

    if (newPassword !== confirmPassword) {
      ctx.throw(422, '两次输入的新密码不一致');
    }

    const adminInner = await ctx.model.AdminInnerUser.findByPk(adminInnerId);
    ctx.assert(adminInner, 401, '账号不存在');

    const match = await ctx.compare(oldPassword, adminInner.password);
    if (!match) {
      ctx.throw(422, '旧密码错误');
    }

    const hashedPassword = await ctx.genHash(newPassword);
    await adminInner.update({ password: hashedPassword });

    ctx.body = {
      code: 200,
      message: '密码修改成功',
      data: null,
    };
  }

  /**
   * 重置当前账号谷歌验证码 (强制清空)
   */
  async resetGoogle() {
    const { ctx } = this;
    const adminInnerId = ctx.state.adminInner.adminInnerId;

    const adminInner = await ctx.model.AdminInnerUser.findByPk(adminInnerId);
    ctx.assert(adminInner, 401, '账号不存在');

    await adminInner.update({ google_code: null });

    ctx.body = {
      code: 200,
      message: '谷歌验证码重置成功',
      data: null,
    };
  }

  /**
   * 生成谷歌验证码二维码 (仅生成不绑定)
   */
  async generateGoogleAuth() {
    const { ctx, app } = this;
    const { username, password } = ctx.request.body;

    ctx.assert(username, 422, '为了您的账号安全，操作谷歌验证码需要验证账号');
    ctx.assert(password, 422, '为了您的账号安全，操作谷歌验证码需要验证登录密码');

    const adminInner = await ctx.model.AdminInnerUser.findOne({ where: { username } });
    ctx.assert(adminInner, 401, '内部管理员账号不存在');

    // 验证当前登录密码
    const match = await ctx.compare(password, adminInner.password);
    if (!match) {
      ctx.throw(422, '登录密码错误，无法生成');
    }

    if (adminInner.google_code) {
      ctx.throw(422, '该账号已绑定谷歌验证码');
    }

    const speakeasy = require('speakeasy');
    const QRCode = require('qrcode');

    const secret = speakeasy.generateSecret({
      name: `内部管理系统(${adminInner.username})`,
    });

    // 将密钥存入 Redis，有效期 5 分钟 (300秒)
    await app.redis.set(`admin_inner_google_auth_secret_${username}`, secret.base32, 'EX', 300);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    ctx.body = {
      code: 200,
      message: '生成成功，请进行扫码并验证绑定',
      data: {
        qrCodeUrl,
      },
    };
  }

  /**
   * 绑定谷歌验证码
   */
  async bindGoogle() {
    const { ctx, app } = this;
    const { userName, code } = ctx.request.body;

    ctx.assert(userName, 422, '请提供要绑定的用户账号(userName)');
    ctx.assert(code, 422, '请提供谷歌验证器上的6位验证码(code)');

    const adminInner = await ctx.model.AdminInnerUser.findOne({ where: { username: userName } });
    ctx.assert(adminInner, 401, '内部管理员账号不存在');

    if (adminInner.google_code) {
      ctx.throw(422, '该账号已绑定谷歌验证码，无需重复绑定');
    }

    // 从 Redis 中取出生成的 secret
    const secret = await app.redis.get(`admin_inner_google_auth_secret_${userName}`);
    if (!secret) {
      ctx.throw(422, '验证码已过期或未获取，请重新获取二维码');
    }

    const speakeasy = require('speakeasy');

    // 验证前端传来的验证码是否与该密钥匹配
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1, // 允许时间上有一定偏差 (前后 30 秒)
    });

    if (!verified) {
      // 验证失败，丢弃缓存
      await app.redis.del(`admin_inner_google_auth_secret_${userName}`);
      ctx.throw(422, '谷歌验证码错误，绑定失败，请重新获取二维码');
    }

    // 验证通过，将密钥正式存入数据库，完成绑定
    await adminInner.update({ google_code: secret });

    // 绑定成功后清除缓存
    await app.redis.del(`admin_inner_google_auth_secret_${userName}`);

    ctx.body = {
      code: 200,
      message: '谷歌验证码绑定成功',
      data: null,
    };
  }

  /**
   * 管理员自行解绑谷歌验证码
   */
  async unbindSelfGoogle() {
    const { ctx } = this;
    const adminInnerId = ctx.state.adminInner.adminInnerId;
    const { username, password } = ctx.request.body;

    ctx.assert(username, 422, '请提供当前管理员的登录账号(username)');
    ctx.assert(password, 422, '为了您的账号安全，解绑需要验证登录密码');

    const adminInner = await ctx.model.AdminInnerUser.findByPk(adminInnerId);
    ctx.assert(adminInner, 401, '内部管理员账号不存在');

    if (adminInner.username !== username) {
      ctx.throw(422, '提供的账号与当前登录账号不一致');
    }

    if (!adminInner.google_code) {
      ctx.throw(422, '您当前未绑定谷歌验证码，无需解绑');
    }

    // 1. 验证登录密码
    const match = await ctx.compare(password, adminInner.password);
    if (!match) {
      ctx.throw(422, '登录密码错误，无法解绑');
    }

    // 2. 验证通过，清空 google_code
    await adminInner.update({ google_code: null });

    ctx.body = {
      code: 200,
      message: '解绑成功，下次登录将不再需要验证码',
      data: null,
    };
  }
}

module.exports = AuthController;
