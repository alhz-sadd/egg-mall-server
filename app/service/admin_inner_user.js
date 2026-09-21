'use strict';

const Service = require('egg').Service;

class AdminInnerUserService extends Service {
  /**
   * 后台用户登录
   * @param {Object} payload 登录参数
   * @param meta
   * @return {Object} token 数据
   */
  async login(payload, meta = {}) {
    const { ctx } = this;
    const { username, password, googleCode } = payload;
    
    // 使用统一的方法获取真实的客户端 IP
    const realIp = ctx.ip || ctx.request.ip || '127.0.0.1';
    
    const { ip = realIp, device = 1, browser = '未知', os = '未知' } = meta;
    
    // 强制使用统一 IP 解析位置
    const location = await ctx.service.sysLog.resolveIpLocation(ip);
    const parsedUa = ctx.service.sysLog.resolveUserAgent(ctx.request.header['user-agent']);

    const logData = {
      username,
      ip,
      location,
      device_type: parsedUa.deviceType,
      browser: parsedUa.browser,
      os: parsedUa.os,
      login_type: 1, // 1:A端
    };

    ctx.assert(username, 422, '账号不能为空');
    ctx.assert(password, 422, '密码不能为空');

    // 仅限平台管理员 (user_type=1) 登录 admin-inner
    const adminInner = await ctx.model.SysUser.findOne({ where: { username, user_type: 1, is_deleted: 0 } });
    if (!adminInner) {
      logData.login_result = 0;
      logData.remark = '登录失败：账号或密码错误';
      await ctx.service.sysLog.recordLoginLog(logData);
      ctx.throw(422, '账号或密码错误');
    }

    if (adminInner.status !== 1) {
      logData.user_id = adminInner.user_id;
      logData.login_result = 0;
      logData.remark = '登录失败：账号已被禁用';
      await ctx.service.sysLog.recordLoginLog(logData);
      ctx.throw(422, '账号已被禁用');
    }

    const match = await ctx.compare(password, adminInner.password);
    if (!match) {
      logData.user_id = adminInner.user_id;
      logData.login_result = 0;
      logData.remark = '登录失败：账号或密码错误';
      await ctx.service.sysLog.recordLoginLog(logData);
      ctx.throw(422, '账号或密码错误');
    }

    if (adminInner.totp_enable === 1) {
      if (!payload.googleCode) {
        logData.user_id = adminInner.user_id;
        logData.login_result = 1;
        logData.remark = '密码校验成功，等待谷歌验证';
        await ctx.service.sysLog.recordLoginLog(logData);
        return { need_totp: true, userId: adminInner.user_id };
      }
      
      // 直接在此校验谷歌验证码
      await ctx.service.totp.loginVerify(adminInner.user_id, payload.googleCode);
    }

    logData.user_id = adminInner.user_id;
    logData.login_result = 1;
    logData.remark = '登录成功';
    await ctx.service.sysLog.recordLoginLog(logData);

    const accessToken = ctx.app.jwt.sign(
      { adminInnerId: adminInner.user_id, username: adminInner.username, type: 'admin_inner' },
      ctx.app.config.jwt.secret,
      { expiresIn: ctx.app.config.jwt.expiresIn },
    );
    console.log('JWT Secret (Signing):', ctx.app.config.jwt.secret);

    const refreshToken = ctx.app.jwt.sign(
      { adminInnerId: adminInner.user_id, type: 'admin_inner', isRefresh: true },
      ctx.app.config.jwt.secret,
      { expiresIn: ctx.app.config.jwt.refreshExpiresIn },
    );

    return { need_totp: false, accessToken, refreshToken };
  }

  /**
   * 登录第二步：谷歌验证通过后下发 token
   */
  async generateTokensAfterTotp(userId) {
    const { ctx } = this;
    const adminInner = await ctx.model.SysUser.findByPk(userId);
    
    const accessToken = ctx.app.jwt.sign(
      { adminInnerId: adminInner.user_id, username: adminInner.username, type: 'admin_inner' },
      ctx.app.config.jwt.secret,
      { expiresIn: ctx.app.config.jwt.expiresIn },
    );

    const refreshToken = ctx.app.jwt.sign(
      { adminInnerId: adminInner.user_id, type: 'admin_inner', isRefresh: true },
      ctx.app.config.jwt.secret,
      { expiresIn: ctx.app.config.jwt.refreshExpiresIn },
    );

    return { accessToken, refreshToken };
  }

  /**
   * 获取用户列表 (支持分页和过滤)
   * @param {Object} query 查询参数
   * @return {Object} 列表和分页数据
   */
  async list(query) {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    const {
      page = 1,
      page_size = 10,
      username,
      nickname,
      phone,
      status,
      user_type,
      user_type_in,
      shop_id,
      inviter_user_id,
      create_user_id,
      keyword,
    } = query;

    const where = { is_deleted: 0 };

    if (user_type) where.user_type = Number(user_type);
    if (user_type_in) where.user_type = { [Op.in]: Array.isArray(user_type_in) ? user_type_in.map(Number) : [ Number(user_type_in) ] };
    if (shop_id) where.shop_id = Number(shop_id);
    if (inviter_user_id) where.inviter_user_id = Number(inviter_user_id);
    if (create_user_id) where.create_user_id = Number(create_user_id);
    if (status !== undefined && status !== '') where.status = Number(status);

    if (username) where.username = { [Op.like]: `%${username}%` };
    if (nickname) where.nickname = { [Op.like]: `%${nickname}%` };
    if (phone) where.phone = { [Op.like]: `%${phone}%` };

    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { nickname: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const limit = Number(page_size);
    const offset = (Number(page) - 1) * limit;

    const { count, rows } = await ctx.model.SysUser.findAndCountAll({
      where,
      limit,
      offset,
      order: [[ 'user_id', 'DESC' ]],
      include: [
        {
          model: ctx.model.Shop,
          as: 'shop',
          attributes: [ 'shop_name', 'shop_no' ],
          required: false,
        },
        {
          model: ctx.model.SalesRechargeAddress,
          as: 'salesRechargeAddress',
          attributes: [ 'address' ],
          required: false,
        },
      ],
    });

    const list = rows.map(item => {
      const data = item.toJSON();
      if (data.shop) {
        data.shop_name = data.shop.shop_name;
        data.shop_no = data.shop.shop_no;
        delete data.shop;
      }
      if (data.salesRechargeAddress) {
        data.recharge_address = data.salesRechargeAddress.address;
        delete data.salesRechargeAddress;
      }
      return data;
    });

    return {
      list,
      pagination: {
        total: count,
        page: Number(page),
        page_size: limit,
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 获取用户详情
   * @param {number} id 用户ID
   * @return {Object} 用户详情
   */
  async detail(id) {
    const { ctx } = this;
    const user = await ctx.model.SysUser.findOne({
      where: { user_id: id, is_deleted: 0 },
      attributes: { exclude: [ 'password', 'totp_secret', 'totp_recovery_codes' ] },
      include: [
        {
          model: ctx.model.Shop,
          as: 'shop',
          attributes: [ 'shop_name', 'shop_no' ],
        },
      ],
    });

    if (!user) return null;

    const data = user.toJSON();
    if (data.shop) {
      data.shop_name = data.shop.shop_name;
      data.shop_no = data.shop.shop_no;
      delete data.shop;
    }
    return data;
  }

  /**
   * 创建用户 (店长/业务员)
   * @param {Object} payload 用户数据
   * @param {Object} options 事务选项
   * @return {Object} 创建成功的用户
   */
  async create(payload, options = {}) {
    const { ctx } = this;
    const { username, password, user_type, shop_id, role_id, status, nickname, phone, email, avatar, remark } = payload;

    // 检查账号是否存在
    const existing = await ctx.model.SysUser.findOne({
      where: { username, is_deleted: 0 },
      transaction: options.transaction,
    });
    if (existing) {
      ctx.throw(422, '账号已存在');
    }

    const hashedPassword = await ctx.genHash(password);
    const user = await ctx.model.SysUser.create({
      username,
      password: hashedPassword,
      user_type: Number(user_type),
      shop_id: shop_id ? Number(shop_id) : null,
      role_id: role_id ? Number(role_id) : null,
      status: status !== undefined ? Number(status) : 1,
      nickname: nickname || username,
      phone: phone || null,
      email: email || null,
      avatar: avatar || null,
      remark: remark || null,
      create_user_id: ctx.state.adminInner ? ctx.state.adminInner.adminInnerId : null,
    }, options);

    // 如果是创建店长 (2) 或 业务员 (3)，同步创建钱包
    if (Number(user_type) === 2 || Number(user_type) === 3) {
      await ctx.model.UserWallet.create({
        user_id: user.user_id,
        balance: 0,
        static_income: 0,
        dynamic_income: 0,
        recharge_balance: 0,
        voucher_balance: 0,
      }, options);
    }

    return user;
  }

  /**
   * 更新用户信息
   * @param {number} id 用户ID
   * @param {Object} payload 更新数据
   * @return {Object} 更新后的用户
   */
  async update(id, payload) {
    const { ctx } = this;
    const transaction = await ctx.model.transaction();

    try {
      const user = await ctx.model.SysUser.findOne({
        where: { user_id: id, is_deleted: 0 },
        transaction,
      });

      if (!user) {
        ctx.throw(404, '用户不存在');
      }

      const updateData = {};
      const fields = [ 'nickname', 'phone', 'email', 'avatar', 'role_id', 'status', 'remark', 'shop_id' ];
      fields.forEach(field => {
        if (payload[field] !== undefined) {
          updateData[field] = payload[field];
        }
      });

      if (payload.password) {
        updateData.password = await ctx.genHash(payload.password);
      }

      // Update sys_user table
      await user.update(updateData, { transaction });

      // Handle recharge_address update for salesmen (user_type 3)
      if (user.user_type === 3 && payload.recharge_address !== undefined) {
        const salesRechargeAddress = await ctx.model.SalesRechargeAddress.findOne({
          where: { sales_user_id: id, shop_id: user.shop_id },
          transaction,
        });

        if (salesRechargeAddress) {
          // Update existing recharge address
          await salesRechargeAddress.update({ address: payload.recharge_address }, { transaction });
        } else {
          // Create new recharge address
          await ctx.model.SalesRechargeAddress.create({
            sales_user_id: id,
            shop_id: user.shop_id,
            address: payload.recharge_address,
          }, { transaction });
        }
      }

      await transaction.commit();
      return user;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * 删除用户 (级联删除)
   * @param {number} id 用户ID
   * @param {Object} operator 操作人信息
   */
  async destroy(id, operator) {
    const { ctx } = this;
    const user = await ctx.model.SysUser.findOne({
      where: { user_id: id, is_deleted: 0 },
    });

    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    const transaction = await ctx.model.transaction();
    try {
      // 1. 软删除用户本身
      await user.update({ is_deleted: 1 }, { transaction });

      // 2. 如果是店长 (user_type=2)，级联删除关联店铺及其下属员工和客户
      if (Number(user.user_type) === 2 && user.shop_id) {
        // 软删除店铺
        await ctx.model.Shop.update(
          { is_deleted: 1 },
          { where: { shop_id: user.shop_id }, transaction },
        );

        // 软删除店铺下的所有用户 (业务员 user_type=3, 客户 user_type=4)
        await ctx.model.SysUser.update(
          { is_deleted: 1 },
          {
            where: {
              shop_id: user.shop_id,
              user_type: { [ctx.app.Sequelize.Op.in]: [ 3, 4 ] },
            },
            transaction,
          },
        );
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * 获取员工业绩统计
   * @param {Object} query 查询参数
   * @return {Object} 统计结果
   */
  async performance(query) {
    const { ctx, app } = this;
    const { shop_id, user_id, start_date, end_date } = query;
    const { Op } = app.Sequelize;

    const where = { user_type: 3, is_deleted: 0 };
    if (shop_id) where.shop_id = Number(shop_id);
    if (user_id) where.user_id = Number(user_id);

    const employees = await ctx.model.SysUser.findAll({
      where,
      attributes: [ 'user_id', 'username', 'nickname', 'shop_id' ],
      include: [
        {
          model: ctx.model.Shop,
          as: 'shop',
          attributes: [ 'shop_name' ],
        },
      ],
      raw: true,
    });

    const result = [];
    for (const emp of employees) {
      // 统计该业务员名下的客户数 (user_type=4)
      const customer_count = await ctx.model.SysUser.count({
        where: {
          inviter_user_id: emp.user_id,
          user_type: 4,
          is_deleted: 0,
        },
      });

      // 统计充值总额
      const rechargeWhere = {
        sales_user_id: emp.user_id,
        status: 2, // 假设 2 为成功
      };
      if (start_date && end_date) {
        rechargeWhere.create_time = {
          [Op.between]: [ new Date(start_date), new Date(end_date) ],
        };
      }

      const total_recharge = await ctx.model.UserRecharge.sum('amount', {
        where: rechargeWhere,
      }) || 0;

      // 统计提现总额
      const withdrawWhere = {
        sales_user_id: emp.user_id,
        status: 2, // 假设 2 为成功
      };
      if (start_date && end_date) {
        withdrawWhere.create_time = {
          [Op.between]: [ new Date(start_date), new Date(end_date) ],
        };
      }
      const total_withdraw = await ctx.model.UserWithdraw.sum('amount', {
        where: withdrawWhere,
      }) || 0;

      result.push({
        user_id: emp.user_id,
        username: emp.username,
        nickname: emp.nickname,
        shop_name: emp['shop.shop_name'],
        customer_count,
        total_recharge: Number(total_recharge),
        total_withdraw: Number(total_withdraw),
        net_amount: Number((total_recharge - total_withdraw).toFixed(2)),
      });
    }

    return result;
  }
}

module.exports = AdminInnerUserService;
