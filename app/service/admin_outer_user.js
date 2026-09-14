'use strict';

const Service = require('egg').Service;

class AdminOuterUserService extends Service {
  async login(payload, meta = {}) {
    const { ctx } = this;
    const { username, password, googleCode } = payload;
    const { ip = ctx.ip, location = await ctx.service.sysLog.resolveIpLocation(ctx.ip), device = 1, browser = '未知', os = '未知' } = meta;

    const logData = {
      username,
      ip,
      location,
      device_type: device,
      browser,
      os,
      login_type: 2, // 2:B端 (商户后台)
    };

    ctx.assert(username, 422, '账号不能为空');
    ctx.assert(password, 422, '密码不能为空');

    const adminOuter = await ctx.model.SysUser.findOne({
      where: {
        username,
        user_type: { [ctx.model.Sequelize.Op.in]: [ 2, 3 ] }, // 允许店长(2)和业务员(3)登录
        is_deleted: 0,
      },
    });

    if (!adminOuter) {
      logData.login_result = 0;
      logData.remark = '登录失败：账号或密码错误';
      await ctx.service.sysLog.recordLoginLog(logData);
      ctx.throw(422, '账号或密码错误');
    }

    if (adminOuter.status !== 1) {
      logData.user_id = adminOuter.user_id;
      logData.login_result = 0;
      logData.remark = '登录失败：账号已被禁用';
      await ctx.service.sysLog.recordLoginLog(logData);
      ctx.throw(422, '账号已被禁用');
    }

    const match = await ctx.compare(password, adminOuter.password);
    if (!match) {
      logData.user_id = adminOuter.user_id;
      logData.login_result = 0;
      logData.remark = '登录失败：账号或密码错误';
      await ctx.service.sysLog.recordLoginLog(logData);
      ctx.throw(422, '账号或密码错误');
    }

    if (adminOuter.totp_secret) {
      if (!googleCode) {
        logData.user_id = adminOuter.user_id;
        logData.login_result = 0;
        logData.remark = '登录失败：谷歌验证码不能为空';
        await ctx.service.sysLog.recordLoginLog(logData);
        ctx.throw(422, '谷歌验证码不能为空');
      }

      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: adminOuter.totp_secret,
        encoding: 'base32',
        token: googleCode,
        window: 1,
      });

      if (!verified) {
        logData.user_id = adminOuter.user_id;
        logData.login_result = 0;
        logData.remark = '登录失败：谷歌验证码错误';
        await ctx.service.sysLog.recordLoginLog(logData);
        ctx.throw(422, '谷歌验证码错误');
      }
    }

    logData.user_id = adminOuter.user_id;
    logData.login_result = 1;
    logData.remark = '登录成功';
    await ctx.service.sysLog.recordLoginLog(logData);

    const accessToken = ctx.app.jwt.sign(
      { adminOuterId: adminOuter.user_id, username: adminOuter.username, type: 'admin_outer' },
      ctx.app.config.jwt.secret,
      { expiresIn: ctx.app.config.jwt.expiresIn },
    );

    const refreshToken = ctx.app.jwt.sign(
      { adminOuterId: adminOuter.user_id, type: 'admin_outer', isRefresh: true },
      ctx.app.config.jwt.secret,
      { expiresIn: ctx.app.config.jwt.refreshExpiresIn },
    );

    return {
      adminOuterId: adminOuter.user_id,
      username: adminOuter.username,
      accessToken,
      refreshToken,
    };
  }

  // 获取B端员工列表 (包含分页与条件过滤)
  async getAdminOuterUsers(query = {}) {
    const { ctx } = this;
    const { page = 1, page_size = 10, shop_id, user_type, user_type_in, username, phone, status } = query;
    const limit = Number(page_size);
    const offset = (Number(page) - 1) * limit;

    const where = { is_deleted: 0 };
    if (shop_id) where.shop_id = shop_id;
    if (user_type) where.user_type = user_type;
    if (user_type_in) where.user_type = { [ctx.app.Sequelize.Op.in]: user_type_in };
    if (username) where.username = { [ctx.app.Sequelize.Op.like]: `%${username}%` };
    if (phone) where.phone = { [ctx.app.Sequelize.Op.like]: `%${phone}%` };
    if (status !== undefined && status !== '') where.status = Number(status);

    const { count, rows } = await ctx.model.SysUser.findAndCountAll({
      where,
      limit,
      offset,
      order: [[ 'create_time', 'DESC' ]],
      attributes: { exclude: [ 'password' ] },
    });

    return {
      total: count,
      list: rows,
      page: Number(page),
      page_size: limit,
    };
  }

  // 根据 ID 获取详情
  async findById(id) {
    const { ctx } = this;
    return await ctx.model.SysUser.findOne({
      where: { user_id: id, is_deleted: 0 },
      attributes: { exclude: [ 'password' ] },
    });
  }

  // 创建B端员工
  async create(payload) {
    const { ctx } = this;
    const { username, password, nickname, phone, shop_id, user_type, created_by } = payload;

    // 生成唯一的邀请码
    const invite_code = await ctx.service.user.generateInviteCode();
    const hashedPassword = await ctx.genHash(password);

    return await ctx.model.SysUser.create({
      username,
      password: hashedPassword,
      nickname,
      phone,
      shop_id,
      user_type,
      invite_code,
      create_user_id: created_by,
      status: 1,
    });
  }

  // 更新员工信息
  async update(id, payload) {
    const { ctx } = this;
    const user = await ctx.model.SysUser.findByPk(id);
    if (!user) ctx.throw(404, '员工不存在');
    await user.update(payload);
    return user;
  }

  // 软删除用户
  async destroy(id) {
    const { ctx } = this;
    const user = await ctx.model.SysUser.findByPk(id);
    if (!user) ctx.throw(404, '员工不存在');

    // 生成带时间戳的唯一用户名，避免软删除后再次注册同名账号或者同名账号被软删除时触发唯一键冲突
    const deletedUsername = `${user.username}_deleted_${Date.now()}`;

    // 注意：update 之前需要确保没有全局 scope 影响，直接强制更新字段
    await ctx.model.SysUser.update(
      { is_deleted: 1, username: deletedUsername },
      { where: { user_id: id } },
    );
  }

  // 重置员工密码
  async resetPassword(id, newPassword, updatedBy) {
    const { ctx } = this;
    const user = await ctx.model.SysUser.findByPk(id);
    if (!user) ctx.throw(404, '员工不存在');

    const hashedPassword = await ctx.genHash(newPassword);
    await user.update({ password: hashedPassword });
  }
}

module.exports = AdminOuterUserService;
