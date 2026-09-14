'use strict';

const Service = require('egg').Service;

/**
 * 上分服务层
 * 处理管理端上分明细的增删改查（平台给用户的上分记录，如佣金、红包等）
 */
class RechargeService extends Service {
  /**
   * 操作类型映射
   */
  get operationTypeMap() {
    return {
      0: '赠送客户',
      1: '员工添加',
      2: '第三方充值',
    };
  }

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
   * 校验分页参数
   * @param {Object} query 查询参数
   * @return {Object} 处理后的分页参数
   */
  parsePagination(query = {}) {
    let { page = 1, pageSize = 10 } = query;
    page = Math.max(1, Number(page) || 1);
    pageSize = Number(pageSize) || 10;
    pageSize = Math.min(100, Math.max(1, pageSize));
    return { page, pageSize, offset: (page - 1) * pageSize };
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
    // SysUser的主键就是 user_id，不论传的是字符串还是数字，我们直接按主键和user_type=4查询
    return await ctx.model.SysUser.findOne({
      where: { user_id: identifier, user_type: 4 },
    });
  }

  /**
   * 管理端获取上分明细列表
   * @param {Object} query 查询参数
   * @param adminId
   * @return {Object} 分页结果 { total, list }
   */
  async adminList(query = {}, adminId) {
    const { ctx } = this;
    const { id, operator_id, user_id, type, operation_type, start_time, end_time } = query;
    const { page, pageSize, offset } = this.parsePagination(query);

    const where = {};
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    if (id !== undefined && id !== '') {
      where.id = Number(id);
    }
    if (operator_id !== undefined && operator_id !== '') {
      where.operator_id = Number(operator_id);
    }
    if (user_id !== undefined && user_id !== '') {
      // 根据 user_id（9-12位）查找用户的数据库主键ID
      const user = await this.getUserByIdOrCode(user_id);
      if (user) {
        where.user_id = user.user_id; // 使用主键ID查询充值记录表
      }
    }
    const typeQuery = type !== undefined ? type : operation_type;
    if (typeQuery !== undefined && typeQuery !== '') {
      where.operation_type = Number(typeQuery);
    }
    if (start_time || end_time) {
      where.created_at = {};
      if (start_time) where.created_at[ctx.app.Sequelize.Op.gte] = new Date(start_time);
      if (end_time) where.created_at[ctx.app.Sequelize.Op.lte] = new Date(end_time);
    }

    const { count, rows } = await ctx.model.RechargeRecord.findAndCountAll({
      where,
      include: [
        {
          model: ctx.model.SysUser,
          as: 'user',
          attributes: [ 'user_id', 'phone', 'username', 'nickname' ],
        },
      ],
      order: [[ 'id', 'DESC' ]],
      offset,
      limit: pageSize,
    });

    // 批量查询业务员信息
    const operatorIds = [ ...new Set(rows.map(item => item.operator_id).filter(Boolean)) ];
    const operatorMap = {};
    if (operatorIds.length > 0) {
      const adminUsers = await ctx.model.AdminUser.findAll({
        attributes: [ 'id', 'username', 'nickname' ],
        where: { id: { [ctx.app.Sequelize.Op.in]: operatorIds } },
        raw: true,
      });
      for (const admin of adminUsers) {
        operatorMap[admin.id] = admin;
      }
    }

    const pageNum = Math.max(1, Number(page));

    return {
      list: rows.map(item => {
        const user = item.user || {};
        const operator = item.operator_id ? operatorMap[item.operator_id] : null;
        const rechargeMoney = Number(item.amount);
        // 当前充值不收取手续费
        const feeMoney = 0;
        const arriveMoney = rechargeMoney;

        return {
          // 通用字段
          user_id: user.user_id || item.user_id,
          user_name: user.user_name || user.user_phone || '',
          admin_id: item.operator_id || null,
          admin_name: operator ? (operator.nickname || operator.username || '') : '',
          order_no: item.order_num || null,
          remark: item.remark || null,
          create_time: this.formatDate(item.created_at),
          update_time: this.formatDate(item.updated_at),
          // 充值列表专用字段
          recharge_money: rechargeMoney,
          recharge_fee_money: feeMoney,
          recharge_user_arrive_money: arriveMoney,
          recharge_platform_arrive_money: arriveMoney,
          recharge_type: item.operation_type,
          examine_type: null, // 当前上分明细无该字段，默认null
          recharge_status: item.status,
        };
      }),
      pagination: {
        total: count,
        page: pageNum,
        page_size: pageSize,
        total_pages: Math.ceil(count / pageSize),
      },
    };
  }

  /**
   * 管理端创建上分明细
   * @param {Object} payload 上分参数
   * @param {number} operatorId 操作员ID
   * @param adminId
   * @return {Object} 创建的上分明细
   */
  async adminCreate(payload, operatorId, adminId) {
    const { ctx } = this;
    const { user_id, amount, type, operation_type, order_id, order_num, remark, status } = payload;

    ctx.assert(user_id, 422, '用户ID不能为空');
    ctx.assert(amount !== undefined && amount !== '', 422, '操作金额不能为空');

    const typeValue = type !== undefined ? type : operation_type;
    ctx.assert([ 0, 1, 2 ].includes(Number(typeValue)), 422, '操作类型只能是 0-赠送客户 1-员工添加 2-第三方充值');

    const user = await this.getUserByIdOrCode(user_id);
    if (!user) {
      ctx.throw(422, '用户不存在');
    }

    const recordData = {
      user_id: user.user_id, // 使用主键ID存储到充值记录表
      operator_id: operatorId,
      operation_type: Number(typeValue),
      amount: Number(amount),
      order_id: order_id !== undefined && order_id !== '' ? Number(order_id) : null,
      order_num: order_num || null,
      recharge_type: 2,
      status: status !== undefined ? Number(status) : 1,
      recharge_date: new Date(),
      remark: remark || null,
    };

    if (adminId !== undefined) {
      recordData.admin_id = adminId;
    }

    const record = await ctx.model.RechargeRecord.create(recordData);

    // 员工添加和赠送客户都直接增加用户余额
    if (Number(amount) > 0) {
      await user.increment('user_balance', { by: Number(amount) });
    }

    return {
      id: record.id,
      user_id: user.user_id, // 返回9-12位的 user_id
      user_name: user.user_name || user.user_phone || '',
      user_phone: user.user_phone || '',
      order_id: record.order_id || null,
      operator_id: record.operator_id || null,
      type: record.operation_type,
      type_text: this.operationTypeMap[record.operation_type] || '未知',
      amount: Number(record.amount),
      order_num: record.order_num || null,
      remark: record.remark || null,
      status: record.status,
      created_at: this.formatDate(record.created_at),
    };
  }

  /**
   * 管理端更新上分明细
   * @param {number} id 记录ID
   * @param {Object} payload 更新参数
   * @param adminId
   * @return {Object} 更新后的上分明细
   */
  async adminUpdate(id, payload, adminId) {
    const { ctx } = this;
    const record = await ctx.model.RechargeRecord.findByPk(id);
    if (!record) {
      ctx.throw(404, '上分明细不存在');
    }
    if (adminId !== undefined && record.admin_id !== adminId) {
      ctx.throw(403, '无权操作该店铺的上分明细');
    }

    const updateData = {};
    if (payload.amount !== undefined && payload.amount !== '') updateData.amount = Number(payload.amount);

    const typeValue = payload.type !== undefined ? payload.type : payload.operation_type;
    if (typeValue !== undefined && typeValue !== '') {
      ctx.assert([ 0, 1, 2 ].includes(Number(typeValue)), 422, '操作类型只能是 0-赠送客户 1-员工添加 2-第三方充值');
      updateData.operation_type = Number(typeValue);
    }

    if (payload.order_id !== undefined && payload.order_id !== '') updateData.order_id = Number(payload.order_id);
    if (payload.order_num !== undefined) updateData.order_num = payload.order_num;
    if (payload.status !== undefined && payload.status !== '') updateData.status = Number(payload.status);
    if (payload.remark !== undefined) updateData.remark = payload.remark;

    await record.update(updateData);

    // 查询关联用户的信息
    const user = await ctx.model.SysUser.findOne({ where: { id: record.user_id, user_type: 4 } });

    return {
      id: record.id,
      user_id: user?.user_id || record.user_id, // 返回9-12位的 user_id
      user_name: user?.user_name || user?.user_phone || '',
      user_phone: user?.user_phone || '',
      order_id: record.order_id || null,
      operator_id: record.operator_id || null,
      type: record.operation_type,
      type_text: this.operationTypeMap[record.operation_type] || '未知',
      amount: Number(record.amount),
      order_num: record.order_num || null,
      remark: record.remark || null,
      status: record.status,
      created_at: this.formatDate(record.created_at),
      updated_at: this.formatDate(record.updated_at),
    };
  }

  /**
   * 管理端删除上分明细（物理删除）
   * @param {number} id 记录ID
   * @param adminId
   */
  async adminDestroy(id, adminId) {
    const { ctx } = this;
    const record = await ctx.model.RechargeRecord.findByPk(id);
    if (!record) {
      ctx.throw(404, '上分明细不存在');
    }
    if (adminId !== undefined && record.admin_id !== adminId) {
      ctx.throw(403, '无权操作该店铺的上分明细');
    }

    await record.destroy();
  }
}

module.exports = RechargeService;
