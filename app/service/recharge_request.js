'use strict';

const Service = require('egg').Service;

/**
 * 充值请求服务层
 * 处理移动端充值请求的创建与管理端列表查询
 */
class RechargeRequestService extends Service {
  /**
   * 格式化时间
   * @param {Date|string} date 日期
   * @return {string} 格式化后的时间字符串
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = n => (n < 10 ? '0' + n : n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /**
   * 按充值列表规范格式化单条记录
   * @param {Object} record RechargeRequest 实例或普通对象
   * @param {Object} user 关联用户对象（可选）
   * @return {Object} 规范后的充值记录
   */
  formatRechargeRecord(record, user = null) {
    const u = user || {};
    const rechargeMoney = Number(record.do_money);

    return {
      // 通用字段
      user_id: u.user_id || record.user_id,
      user_name: u.user_name || u.user_phone || '',
      admin_id: record.admin_id || null,
      admin_name: record.admin_name || '',
      order_no: record.order_num,
      remark: record.remark || null,
      create_time: this.formatDate(record.created_at),
      update_time: this.formatDate(record.updated_at),
      // 充值列表专用字段
      recharge_id: record.id,
      is_first_recharge: record.is_first === 1,
      recharge_money: rechargeMoney,
      recharge_fee_money: 0,
      recharge_user_arrive_money: rechargeMoney,
      recharge_platform_arrive_money: rechargeMoney,
      recharge_type: record.pay_way,
      examine_type: record.status === 1 ? record.examine_type : null,
      recharge_status: record.status,
    };
  }

  /**
   * 生成充值订单号
   * 格式：20 + 14位随机数字，共16位纯数字，例如 2012345678901234
   * @return {Promise<string>} 订单号
   */
  async generateOrderNum() {
    const { ctx } = this;
    const prefix = '20';
    let orderNum;
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 100) {
      const random = String(Math.floor(Math.random() * 1e14)).padStart(14, '0');
      orderNum = prefix + random;
      const record = await ctx.model.RechargeRequest.findOne({ where: { order_num: orderNum } });
      if (!record) {
        exists = false;
      }
      attempts++;
    }
    return orderNum;
  }

  /**
   * 根据 user_id（9-12位）或数据库主键ID查询用户
   * @param {string|number} identifier 用户标识
   * @return {Promise<Object|null>} 用户对象
   */
  async getUserByIdOrCode(identifier) {
    const { ctx } = this;
    if (!identifier) return null;
    const strVal = String(identifier);
    // 9+ 位视为 user_id（即 user_code）
    if (strVal.length >= 9) {
      const user = await ctx.model.User.findOne({ where: { user_id: strVal } });
      if (user) return user;
    }
    return await ctx.model.User.findByPk(Number(identifier));
  }

  /**
   * 判断用户是否为首充
   * @param {number} userId 用户主键ID
   * @return {boolean} 是否首充
   */
  async isFirstRecharge(userId) {
    const { ctx } = this;
    const count = await ctx.model.RechargeRequest.count({
      where: { user_id: userId, status: 1 },
    });
    return count === 0;
  }

  /**
   * 根据用户查询归属的业务员（admin_id/admin_name）
   * 查找优先级：
   *   1) user.bind_salesperson_id（直接绑定业务员ID -> admin_users.id）
   *   2) user.bind_salesperson_id 且 user.admin_role=2（自身即为业务员）
   *   3) user.user_referral_id（上级用户）-> 递归解析其归属业务员
   * @param {number|string|Object} user 用户ID或用户对象
   * @return {Promise<{adminId:number|null, adminName:string|null}>} 返回业务员信息
   */
  async resolveSalespersonAdmin(user) {
    const { ctx } = this;
    if (!user) return { adminId: null, adminName: null };

    let u = typeof user === 'number' || typeof user === 'string'
      ? await this.getUserByIdOrCode(user)
      : user;
    if (!u) return { adminId: null, adminName: null };

    const visited = new Set();
    while (u) {
      const uid = u.user_id; // 使用 user_id（9-12位）作为访问标识
      if (visited.has(uid)) break;
      visited.add(uid);

      // 1) 优先使用 bind_salesperson_id
      if (u.bind_salesperson_id) {
        const sp = await ctx.model.AdminUser.findByPk(Number(u.bind_salesperson_id));
        if (sp) return { adminId: sp.id, adminName: sp.nickname || sp.username || String(sp.id) };
      }

      // 3) 沿 user_referral_id 向上递归
      if (!u.user_referral_id) break;
      u = await this.getUserByIdOrCode(u.user_referral_id);
    }
    return { adminId: null, adminName: null };
  }

  /**
   * 获取用户归属业务员的充值地址
   * @param {number|string} userId 用户ID（user_id，9-12位）
   * @return {Promise<{address: string|null}>} 返回包含地址的对象
   */
  async getRechargeAddress(userId) {
    const { ctx } = this;
    const user = await this.getUserByIdOrCode(userId);
    if (!user) {
      return { address: null };
    }

    let targetAdminId = null;

    // 1. 如果登录的用户本身也是业务员，就返回自己的充值地址
    if (user.admin_role === 2) {
      if (user.bind_salesperson_id) {
        targetAdminId = user.bind_salesperson_id;
      } else {
        // 兜底：通过手机号/用户名去查找对应的业务员账号
        const adminUser = await ctx.model.AdminUser.findOne({
          where: { username: user.user_phone, role: 2 },
        });
        if (adminUser) {
          targetAdminId = adminUser.id;
        }
      }
    } else {
      // 2. 如果是普通用户，就返回属于哪个业务员的地址
      const { adminId } = await this.resolveSalespersonAdmin(user);
      targetAdminId = adminId;
    }

    if (!targetAdminId) {
      return { address: null };
    }

    const adminUser = await ctx.model.AdminUser.findByPk(targetAdminId);
    if (!adminUser) {
      return { address: null };
    }

    return { address: adminUser.bindRechargeaddress || null };
  }

  /**
   * 移动端创建充值请求
   * @param {number|string} userId 用户ID（user_id，9-12位）
   * @param {Object} payload 请求参数
   * @return {Object} 创建的充值请求
   */
  async create(userId, payload) {
    const { ctx } = this;
    const { do_money, pay_way, examine_type, remark } = payload;

    ctx.logger.info('[RechargeRequestService.create] 用户 %s 发起充值请求，原始金额: %s，充值方式: %s，审核类型: %s', userId, do_money, pay_way, examine_type);

    ctx.assert(do_money !== undefined && do_money !== '', 422, '充值金额不能为空');

    const amount = Number(do_money);
    ctx.assert(amount > 0, 422, '充值金额必须大于0');
    ctx.logger.info('[RechargeRequestService.create] 金额校验通过，充值金额: %s', amount);

    const user = await this.getUserByIdOrCode(userId);
    ctx.assert(user, 422, '用户不存在');
    ctx.logger.info('[RechargeRequestService.create] 用户存在校验通过，用户ID: %s', user.id);

    const first = await this.isFirstRecharge(user.id);
    ctx.logger.info('[RechargeRequestService.create] 是否首充: %s', first ? '是' : '否');

    const { adminId, adminName } = await this.resolveSalespersonAdmin(user);
    ctx.logger.info('[RechargeRequestService.create] 归属业务员解析结果: adminId=%s, adminName=%s', adminId, adminName);

    const request = await ctx.model.RechargeRequest.create({
      user_id: user.id, // 使用主键ID存储到充值请求表
      admin_id: adminId || null,
      admin_name: adminName || null,
      order_num: await this.generateOrderNum(),
      do_money: amount,
      sys_get_money: amount,
      user_get_money: amount,
      sx_money: 0,
      status: 0,
      examine_type: examine_type !== undefined ? Number(examine_type) : 0,
      pay_way: pay_way !== undefined ? Number(pay_way) : 0,
      is_first: first ? 1 : 0,
      remark: remark || null,
    });

    ctx.logger.info('[RechargeRequestService.create] 充值请求创建成功，订单号: %s，用户主键ID: %s，金额: %s，状态: %s', request.order_num, request.user_id, request.do_money, request.status);

    return request.toJSON();
  }

  /**
   * 管理端获取充值请求列表
   * @param {Object} query 查询参数
   * @return {Object} 分页结果
   */
  async adminList(query = {}) {
    const { ctx } = this;
    const { user_id, status, examine_type, pay_way, page = 1, pageSize = 10 } = query;

    const where = {};
    if (user_id !== undefined && user_id !== '') {
      // 根据 user_id（9-12位）查找用户的数据库主键ID
      const user = await this.getUserByIdOrCode(user_id);
      if (user) {
        where.user_id = user.id; // 使用主键ID查询充值请求表
      }
    }
    if (status !== undefined && status !== '') {
      where.status = Number(status);
    }
    if (examine_type !== undefined && examine_type !== '') {
      where.examine_type = Number(examine_type);
    }
    if (pay_way !== undefined && pay_way !== '') {
      where.pay_way = Number(pay_way);
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 10));
    const offset = (pageNum - 1) * size;

    const { count, rows } = await ctx.model.RechargeRequest.findAndCountAll({
      where,
      include: [
        {
          model: ctx.model.User,
          as: 'user',
          attributes: [ 'id', 'user_id', 'user_phone', 'user_name' ],
        },
      ],
      order: [[ 'id', 'DESC' ]],
      offset,
      limit: size,
    });

    return {
      total: count,
      list: rows.map(item => this.formatRechargeRecord(item, item.user)),
    };
  }

  /**
   * 管理端充值请求审核成功
   * admin_id/admin_name 字段语义为"归属业务员"：创建时已写入即保留，否则用审核人兜底
   * @param {Object} payload 审核参数
   * @return {Object} 更新后的充值请求
   */
  async auditSuccess(payload) {
    const { ctx } = this;
    const { recharge_id, recharge_money, recharge_user_arrive_money, recharge_platform_arrive_money, examine_type, remark, google_code } = payload;

    // 必填参数校验
    ctx.assert(recharge_id !== undefined && recharge_id !== '', 422, 'recharge_id不能为空');
    ctx.assert(recharge_money !== undefined && recharge_money !== '', 422, 'recharge_money不能为空');
    ctx.assert(recharge_user_arrive_money !== undefined && recharge_user_arrive_money !== '', 422, 'recharge_user_arrive_money不能为空');
    ctx.assert(recharge_platform_arrive_money !== undefined && recharge_platform_arrive_money !== '', 422, 'recharge_platform_arrive_money不能为空');
    ctx.assert(examine_type !== undefined && examine_type !== '', 422, 'examine_type不能为空');
    ctx.assert(remark !== undefined && remark !== '', 422, 'remark不能为空');

    // 校验 google_code（二级密码）
    const operator = ctx.state.admin || {};
    const adminUser = operator.adminId ? await ctx.model.AdminUser.findByPk(operator.adminId) : null;
    ctx.assert(adminUser, 401, '管理员不存在');

    if (adminUser.google_code) {
      ctx.assert(google_code !== undefined && google_code !== '', 422, 'google_code不能为空');
      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: adminUser.google_code,
        encoding: 'base32',
        token: google_code,
        window: 1,
      });

      if (!verified) {
        ctx.throw(422, 'google_code验证失败');
      }
    }

    const request = await ctx.model.RechargeRequest.findByPk(Number(recharge_id));
    ctx.assert(request, 404, '充值请求不存在');
    ctx.assert(request.status === 0, 422, '该充值请求已处理');

    let finalAdminId = request.admin_id || null;
    let finalAdminName = request.admin_name || null;
    if (!finalAdminId) {
      const resolved = await this.resolveSalespersonAdmin(request.user_id);
      if (resolved.adminId) {
        finalAdminId = resolved.adminId;
        finalAdminName = resolved.adminName;
      } else {
        const currentAdmin = await ctx.model.AdminUser.findByPk(operator.adminId);
        finalAdminId = operator.adminId || null;
        finalAdminName = currentAdmin ? (currentAdmin.nickname || currentAdmin.username) : null;
      }
    }

    const updateData = {
      status: 1,
      admin_id: finalAdminId,
      admin_name: finalAdminName,
      do_money: Number(recharge_money),
      user_get_money: Number(recharge_user_arrive_money),
      sys_get_money: Number(recharge_platform_arrive_money),
      examine_type: Number(examine_type),
      remark,
    };

    const user = await ctx.model.User.findByPk(request.user_id);
    ctx.assert(user, 422, '用户不存在');

    // 事务：更新请求 + 给用户加余额 + 累加充值金额
    const transaction = await ctx.model.transaction();
    try {
      await request.update(updateData, { transaction });

      const addAmount = updateData.user_get_money;
      const rechargeAmount = updateData.do_money;
      if (Number(addAmount) > 0 || Number(rechargeAmount) > 0) {
        const updateFields = {};
        if (Number(addAmount) > 0) {
          updateFields.user_balance = Number(user.user_balance) + Number(addAmount);
        }
        if (Number(rechargeAmount) > 0) {
          updateFields.recharge_amount = Number(user.recharge_amount) + Number(rechargeAmount);
        }
        await user.update(updateFields, { transaction });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    return this.formatRechargeRecord(request, user);
  }

  /**
   * 管理端充值请求审核失败
   * admin_id/admin_name 字段语义为"归属业务员"：创建时已写入即保留，否则用审核人兜底
   * @param {Object} payload 审核参数
   * @return {Object} 更新后的充值请求
   */
  async auditFail(payload) {
    const { ctx } = this;
    const { recharge_id, remark, google_code } = payload;

    // 必填参数校验
    ctx.assert(recharge_id !== undefined && recharge_id !== '', 422, 'recharge_id不能为空');
    ctx.assert(remark !== undefined && remark !== '', 422, 'remark不能为空');

    // 校验 google_code（二级密码）
    const operator = ctx.state.admin || {};
    const adminUser = operator.adminId ? await ctx.model.AdminUser.findByPk(operator.adminId) : null;
    ctx.assert(adminUser, 401, '管理员不存在');

    if (adminUser.google_code) {
      ctx.assert(google_code !== undefined && google_code !== '', 422, 'google_code不能为空');
      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: adminUser.google_code,
        encoding: 'base32',
        token: google_code,
        window: 1,
      });

      if (!verified) {
        ctx.throw(422, 'google_code验证失败');
      }
    }

    const request = await ctx.model.RechargeRequest.findByPk(Number(recharge_id));
    ctx.assert(request, 404, '充值请求不存在');
    ctx.assert(request.status === 0, 422, '该充值请求已处理');

    let finalAdminId = request.admin_id || null;
    let finalAdminName = request.admin_name || null;
    if (!finalAdminId) {
      const resolved = await this.resolveSalespersonAdmin(request.user_id);
      if (resolved.adminId) {
        finalAdminId = resolved.adminId;
        finalAdminName = resolved.adminName;
      } else {
        const currentAdmin = await ctx.model.AdminUser.findByPk(operator.adminId);
        finalAdminId = operator.adminId || null;
        finalAdminName = currentAdmin ? (currentAdmin.nickname || currentAdmin.username) : null;
      }
    }

    const updateData = {
      status: 2,
      admin_id: finalAdminId,
      admin_name: finalAdminName,
      remark,
    };

    await request.update(updateData);

    const user = await ctx.model.User.findByPk(request.user_id);
    return this.formatRechargeRecord(request, user);
  }

  /**
   * 移动端获取当前用户的充值记录列表
   * @param {number|string} userId 用户ID（user_id，9-12位）
   * @param {Object} query 查询参数
   * @return {Object} 分页结果
   */
  async mobileList(userId, query = {}) {
    const { ctx } = this;
    const { status, page = 1, pageSize = 10 } = query;

    // 根据 user_id 查找用户的数据库主键ID
    const user = await this.getUserByIdOrCode(userId);
    const dbUserId = user ? user.id : userId;

    const where = { user_id: dbUserId };
    if (status !== undefined && status !== '') {
      where.status = Number(status);
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 10));
    const offset = (pageNum - 1) * size;

    const { count, rows } = await ctx.model.RechargeRequest.findAndCountAll({
      where,
      order: [[ 'id', 'DESC' ]],
      offset,
      limit: size,
    });

    const list = rows.map(item => ({
      rechargeId: item.id,
      orderNum: item.order_num,
      doMoney: Number(item.do_money),
      userGetMoney: Number(item.user_get_money),
      status: item.status,
      payWay: item.pay_way,
      isFirst: item.is_first,
      remark: item.remark || null,
      cTime: item.created_at ? new Date(item.created_at).toISOString() : null,
    }));

    return {
      total: count,
      list,
    };
  }
}

module.exports = RechargeRequestService;
