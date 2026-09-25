'use strict';

const Service = require('egg').Service;

class AdminOuterUserService extends Service {
  async login(payload, meta = {}) {
    const { ctx } = this;
    const { username, password, googleCode } = payload;
    
    // 使用统一的方法获取真实的客户端 IP
    const realIp = ctx.ip || ctx.request.ip || '127.0.0.1';
    
    const { ip = realIp } = meta;
    
    // 强制使用统一 UA 解析
    const parsedUa = ctx.service.sysLog.resolveUserAgent(ctx.request.header['user-agent']);

    const logData = {
      user_id: null,
      username,
      ip,
      location: '',
      device_type: parsedUa.deviceType,
      browser: parsedUa.browser,
      os: parsedUa.os,
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

    if (adminOuter.totp_enable === 1) {
      if (!payload.googleCode) {
        logData.user_id = adminOuter.user_id;
        logData.login_result = 1;
        logData.remark = '密码校验成功，等待谷歌验证';
        await ctx.service.sysLog.recordLoginLog(logData);
        return { need_totp: true, userId: adminOuter.user_id };
      }
      
      // 直接在此校验谷歌验证码
      await ctx.service.totp.loginVerify(adminOuter.user_id, payload.googleCode);
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
      need_totp: false,
      adminOuterId: adminOuter.user_id,
      username: adminOuter.username,
      accessToken,
      refreshToken,
    };
  }

  /**
   * 登录第二步：谷歌验证通过后下发 token
   */
  async generateTokensAfterTotp(userId) {
    const { ctx } = this;
    const adminOuter = await ctx.model.SysUser.findByPk(userId);
    
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
      order: [[ 'create_time', 'ASC' ]],
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

    const hashedPassword = await ctx.genHash(password);

    const transaction = await ctx.model.transaction();
    try {
      const user = await ctx.model.SysUser.create({
        username,
        password: hashedPassword,
        nickname,
        phone,
        shop_id,
        user_type,
        create_user_id: created_by,
        status: 1,
      }, { transaction });

      const invite_code = await ctx.service.user.generateInviteCode(user.user_id);
      await user.update({ invite_code }, { transaction });

      // 如果创建的是业务员或店长，同步创建钱包
      if (Number(user_type) === 2 || Number(user_type) === 3) {
        await ctx.model.UserWallet.create({
          user_id: user.user_id,
          balance: 0,
          static_income: 0,
          dynamic_income: 0,
          recharge_balance: 0,
          voucher_balance: 0,
        }, { transaction });
      }

      await transaction.commit();
      return user;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // 更新员工信息
  async update(id, payload) {
    const { ctx } = this;
    const user = await ctx.model.SysUser.findByPk(id);
    if (!user) ctx.throw(404, '员工不存在');
    
    // 过滤掉 user_id 和 invite_code，确保不可修改
    const updateData = { ...payload };
    delete updateData.user_id;
    delete updateData.invite_code;

    await user.update(updateData);
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
