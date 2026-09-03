'use strict';

const Service = require('egg').Service;

/**
 * 提现服务层
 * 处理移动端提现请求的创建与管理端审核
 */
class WithdrawService extends Service {
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
   * 生成提现订单号
   * 格式：10 + 14位随机数字，共16位纯数字，例如 1012345678901234
   * @return {Promise<string>} 订单号
   */
  async generateOrderNum() {
    const { ctx } = this;
    const prefix = '10';
    let orderNum;
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 100) {
      const random = String(Math.floor(Math.random() * 1e14)).padStart(14, '0');
      orderNum = prefix + random;
      const record = await ctx.model.WithdrawRecord.findOne({ where: { order_num: orderNum } });
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
   * 根据用户查询归属的业务员（admin_id/admin_name）
   * 查找优先级：
   *   1) user.bind_salesperson_id（直接绑定业务员ID -> admin_users.id）
   *   2) user.bind_salesperson_id 且 user.admin_role=2（自身即为业务员）
   *   3) user.user_referral_id（上级用户）-> 递归解析其归属业务员
   * @param {number|Object} user 用户ID或用户对象（含bind_salesperson_id/user_referral_id/admin_role）
   * @return {Promise<{adminId:number|null, adminName:string|null}>}
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
      const uid = u.user_id;
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
   * 移动端创建提现请求
   * @param {number|string} userId 用户ID（user_id，即user_code）
   * @param {Object} payload 请求参数
   * @return {Object} 创建的提现请求
   */
  async create(userId, payload) {
    const { ctx } = this;
    const { amount, address, way, remark, user_withdraw_password } = payload;

    ctx.logger.info('[WithdrawService.create] 用户 %s 发起提现请求，原始金额: %s，提现方式: %s，提现地址: %s', userId, amount, way, address);

    ctx.assert(amount !== undefined && amount !== '', 422, '提现金额不能为空');
    const money = Number(amount);
    ctx.assert(money > 0, 422, '提现金额必须大于0');
    ctx.logger.info('[WithdrawService.create] 金额校验通过，提现金额: %s', money);

    const user = await this.getUserByIdOrCode(userId);
    ctx.assert(user, 422, '用户不存在');
    ctx.logger.info('[WithdrawService.create] 用户存在校验通过，用户ID: %s，当前余额: %s', userId, user.user_balance);

    // 解析归属业务员信息（提现创建时即写入，列表/审核时可直接展示）
    const { adminId, adminName } = await this.resolveSalespersonAdmin(user);
    ctx.logger.info('[WithdrawService.create] 归属业务员解析结果: adminId=%s, adminName=%s', adminId, adminName);

    // 校验提现密码（兼容历史 bcrypt 密文和当前明文）
    ctx.assert(user_withdraw_password !== undefined && user_withdraw_password !== '', 422, '提现密码不能为空');
    const isPlain = !user.user_withdraw_password || !user.user_withdraw_password.startsWith('$2a$');
    const match = isPlain ? user_withdraw_password === user.user_withdraw_password : await ctx.compare(user_withdraw_password, user.user_withdraw_password);
    ctx.logger.info('[WithdrawService.create] 提现密码校验结果: %s，密码类型: %s', match ? '通过' : '失败', isPlain ? '明文' : 'bcrypt');
    ctx.assert(match, 422, '提现密码错误');

    const balanceEnough = Number(user.user_balance) >= money;
    ctx.logger.info('[WithdrawService.create] 余额校验，当前余额: %s，提现金额: %s，是否充足: %s', user.user_balance, money, balanceEnough ? '是' : '否');
    ctx.assert(balanceEnough, 422, '余额不足');

    // 简单计算：手续费为提现金额的 3%，到账金额 = 提现金额 - 手续费
    const sxMoney = Number((money * 0.03).toFixed(2));
    const takeMoney = Number((money - sxMoney).toFixed(2));
    ctx.logger.info('[WithdrawService.create] 费用计算，提现金额: %s，手续费: %s，到账金额: %s', money, sxMoney, takeMoney);

    const transaction = await ctx.model.transaction();
    try {
      const request = await ctx.model.WithdrawRecord.create({
        user_id: user.id, // 使用主键ID存储到提现记录表
        admin_id: adminId || null,
        admin_name: adminName || null,
        order_num: await this.generateOrderNum(),
        address: address || '',
        amount: money,
        sx_money: sxMoney,
        take_money: takeMoney,
        status: 0,
        way: way !== undefined ? Number(way) : 0,
        examine_status: null,
        remark: remark || null,
      }, { transaction });

      // 创建时先扣除余额
      const beforeBalance = Number(user.user_balance);
      const afterBalance = beforeBalance - money;
      await user.update({ user_balance: afterBalance }, { transaction });
      await transaction.commit();

      ctx.logger.info('[WithdrawService.create] 提现请求创建成功，订单号: %s，用户ID: %s，提现金额: %s，扣除前余额: %s，扣除后余额: %s，状态: %s', request.order_num, request.user_id, request.amount, beforeBalance, afterBalance, request.status);

      return request.toJSON();
    } catch (err) {
      await transaction.rollback();
      ctx.logger.error('[WithdrawService.create] 提现请求处理失败，用户ID: %s，错误: %s', userId, err.message);
      throw err;
    }
  }

  /**
   * 管理端获取提现列表
   * @param {Object} query 查询参数
   * @param adminId
   * @return {Object} 分页结果
   */
  async adminList(query = {}, adminId) {
    const { ctx } = this;
    const {
      id,
      user_id,
      admin_id,
      order_num,
      status,
      way,
      examine_status,
      start_time,
      end_time,
      page = 1,
      pageSize = 10,
    } = query;

    const where = {};
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    if (id !== undefined && id !== '') {
      where.id = Number(id);
    }
    if (user_id !== undefined && user_id !== '') {
      // 根据 user_id（9-12位）查找用户的数据库主键ID
      const user = await this.getUserByIdOrCode(user_id);
      if (user) {
        where.user_id = user.id; // 使用主键ID查询提现记录表
      }
    }
    if (admin_id !== undefined && admin_id !== '') {
      where.admin_id = Number(admin_id);
    }
    if (order_num !== undefined && order_num !== '') {
      where.order_num = { [ctx.app.Sequelize.Op.like]: `%${order_num}%` };
    }
    if (status !== undefined && status !== '') {
      where.status = Number(status);
    }
    if (way !== undefined && way !== '') {
      where.way = Number(way);
    }
    if (examine_status !== undefined && examine_status !== '') {
      where.examine_status = Number(examine_status);
    }
    if (start_time !== undefined && start_time !== '' || end_time !== undefined && end_time !== '') {
      where.created_at = {};
      if (start_time !== undefined && start_time !== '') {
        where.created_at[ctx.app.Sequelize.Op.gte] = new Date(start_time);
      }
      if (end_time !== undefined && end_time !== '') {
        where.created_at[ctx.app.Sequelize.Op.lte] = new Date(end_time);
      }
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 10));
    const offset = (pageNum - 1) * size;

    const { count, rows } = await ctx.model.WithdrawRecord.findAndCountAll({
      where,
      include: [
        {
          model: ctx.model.User,
          as: 'user',
          attributes: [ 'id', 'user_id', 'user_phone', 'user_name', 'user_referral_id' ],
        },
      ],
      order: [[ 'id', 'DESC' ]],
      offset,
      limit: size,
    });

    // 批量查询上级用户信息（user_referral_id 存储的是上级用户的 user_id，需要用 user_code 查询）
    const parentUserCodes = [];
    for (const item of rows) {
      const user = item.user || {};
      if (user.user_referral_id) {
        parentUserCodes.push(user.user_referral_id);
      }
    }
    const uniqueParentUserCodes = [ ...new Set(parentUserCodes) ];
    const parentUserMap = {};
    if (uniqueParentUserCodes.length > 0) {
      const parentUsers = await ctx.model.User.findAll({
        attributes: [ 'id', 'user_id', 'user_phone', 'user_name' ],
        where: { user_id: { [ctx.app.Sequelize.Op.in]: uniqueParentUserCodes } },
        raw: true,
      });
      for (const pu of parentUsers) {
        parentUserMap[pu.user_id] = pu;
      }
    }

    return {
      total: count,
      list: rows.map(item => {
        const user = item.user || {};
        const withdrawMoney = Number(item.amount);
        const feeMoney = item.sx_money ? Number(item.sx_money) : 0;
        const arriveMoney = Number(item.take_money);

        return {
          // 通用字段
          user_id: user.user_id || item.user_id,
          user_name: user.user_name || user.user_phone || '',
          admin_id: item.admin_id || null,
          admin_name: item.admin_name || '',
          order_no: item.order_num,
          remark: item.remark || null,
          create_time: this.formatDate(item.created_at),
          update_time: this.formatDate(item.updated_at),
          // 提现列表专用字段
          withdraw_id: item.id,
          withdraw_money: withdrawMoney,
          withdraw_fee_money: feeMoney,
          withdraw_arrive_money: arriveMoney,
          // 展示提现记录存的 address
          withdraw_address: item.address || '',
          withdraw_type: item.way,
          withdraw_status: item.status,
          examine_type: item.examine_status !== null ? item.examine_status : null,
        };
      }),
    };
  }

  /**
   * 管理端提现审核成功
   * admin_id/admin_name 字段语义为"归属业务员/主管"：创建时已写入即保留，否则用审核人兜底
   * @param {Object} payload 审核参数
   * @return {Object} 更新后的提现请求
   */
  async auditSuccess(payload) {
    const { ctx } = this;
    const { withdraw_id, id, examine_type, take_money, sx_money, amount, remark } = payload;

    // 兼容前端传 id 或 withdraw_id
    const recordId = withdraw_id || id || payload.withdrawId;
    const request = await ctx.model.WithdrawRecord.findByPk(recordId);
    ctx.assert(request, 404, '提现请求不存在');
    ctx.assert(request.status === 0, 422, '该提现请求已处理');

    // 若创建时未写入归属业务员，则尝试根据user_id解析后补齐；仍为空时用审核人兜底
    let finalAdminId = request.admin_id || null;
    let finalAdminName = request.admin_name || null;
    if (!finalAdminId) {
      const resolved = await this.resolveSalespersonAdmin(request.user_id);
      if (resolved.adminId) {
        finalAdminId = resolved.adminId;
        finalAdminName = resolved.adminName;
      } else {
        const admin = ctx.state.admin || {};
        if (!admin.adminId) {
          ctx.throw(401, '未授权操作：无法获取管理员信息');
        }
        const adminId = admin.adminId;
        const adminUser = await ctx.model.AdminUser.findByPk(adminId);
        finalAdminId = adminId || null;
        finalAdminName = adminUser ? (adminUser.nickname || adminUser.username) : null;
      }
    }

    const updateData = {
      status: 1,
      admin_id: finalAdminId,
      admin_name: finalAdminName,
    };

    const inputTakeMoney = take_money !== undefined ? take_money : payload.takeMoney;
    if (inputTakeMoney !== undefined && inputTakeMoney !== '') {
      updateData.take_money = Number(inputTakeMoney);
    }
    const inputSxMoney = sx_money !== undefined ? sx_money : payload.sxMoney;
    if (inputSxMoney !== undefined && inputSxMoney !== '') {
      updateData.sx_money = Number(inputSxMoney);
    }
    const inputAmount = amount !== undefined ? amount : payload.money;
    if (inputAmount !== undefined && inputAmount !== '') {
      updateData.amount = Number(inputAmount);
    }
    const inputExamineType = examine_type !== undefined ? examine_type : payload.examineType;
    if (inputExamineType !== undefined && inputExamineType !== '') {
      updateData.examine_status = Number(inputExamineType);
    }
    if (remark !== undefined) {
      updateData.remark = remark;
    }

    await request.update(updateData);
    return request.toJSON();
  }

  /**
   * 管理端提现审核失败
   * admin_id/admin_name 字段语义为"归属业务员/主管"：创建时已写入即保留，否则用审核人兜底
   * @param {Object} payload 审核参数
   * @param operatorAdminId
   * @return {Object} 更新后的提现请求
   */
  async auditFail(payload, operatorAdminId) {
    const { ctx } = this;
    const { withdraw_id, id, remark } = payload;

    // 兼容前端传 id 或 withdraw_id
    const recordId = withdraw_id || id;
    const request = await ctx.model.WithdrawRecord.findByPk(recordId);
    ctx.assert(request, 404, '提现请求不存在');
    ctx.assert(request.status === 0, 422, '该提现请求已处理');
    if (operatorAdminId !== undefined && request.admin_id !== operatorAdminId) {
      ctx.throw(403, '无权操作该店铺的提现请求');
    }

    // 若创建时未写入归属业务员，则尝试根据user_id解析后补齐；仍为空时用审核人兜底
    let finalAdminId = request.admin_id || null;
    let finalAdminName = request.admin_name || null;
    if (!finalAdminId) {
      const resolved = await this.resolveSalespersonAdmin(request.user_id);
      if (resolved.adminId) {
        finalAdminId = resolved.adminId;
        finalAdminName = resolved.adminName;
      } else {
        const admin = ctx.state.admin || {};
        const adminId = admin.adminId;
        const adminUser = adminId ? await ctx.model.AdminUser.findByPk(adminId) : null;
        finalAdminId = adminId || null;
        finalAdminName = adminUser ? (adminUser.nickname || adminUser.username) : null;
      }
    }

    const transaction = await ctx.model.transaction();
    try {
      await request.update({
        status: 2,
        admin_id: finalAdminId,
        admin_name: finalAdminName,
        examine_status: null,
        remark: remark || null,
      }, { transaction });

      // 审核失败，把提现金额退回到用户余额
      const user = await ctx.model.User.findByPk(request.user_id, { transaction });
      if (user) {
        await user.update({ user_balance: Number(user.user_balance) + Number(request.amount) }, { transaction });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    return request.toJSON();
  }

  /**
   * 移动端获取当前用户的提现记录列表
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

    const { count, rows } = await ctx.model.WithdrawRecord.findAndCountAll({
      where,
      order: [[ 'id', 'DESC' ]],
      offset,
      limit: size,
    });

    const list = rows.map(item => ({
      id: item.id,
      order_num: item.order_num,
      amount: Number(item.amount),
      sx_money: Number(item.sx_money),
      take_money: Number(item.take_money),
      status: item.status,
      way: item.way,
      address: item.address || '',
      remark: item.remark || null,
      created_at: item.created_at ? new Date(item.created_at).toISOString() : null,
    }));

    return {
      total: count,
      list,
    };
  }
}

module.exports = WithdrawService;
