'use strict';

const Controller = require('egg').Controller;

class AdminOuterPointsController extends Controller {
  // B端 获取人工加款(上分)记录列表
  async giveList() {
    const { ctx } = this;
    const { shop_id, user_id: operator_id } = ctx.state.adminOuter || {};
    const { page = 1, page_size = 10, keyword, operator_keyword, balance_type, start_time, end_time } = ctx.query;
    const limit = Number(page_size);
    const offset = (Number(page) - 1) * limit;

    const { Op } = ctx.app.Sequelize;

    // 先查出该店铺下所有的C端用户ID
    const relations = await ctx.model.CustomerRelation.findAll({
      where: { shop_id },
      attributes: [ 'c_user_id' ],
    });
    const shopUserIds = relations.map(r => r.c_user_id);

    if (shopUserIds.length === 0) {
      ctx.body = { code: 200, message: '获取成功', data: { total: 0, list: [] } };
      return;
    }

    const where = {
      biz_type: 8, // 8 为人工上分
      user_id: { [Op.in]: shopUserIds },
    };

    if (balance_type) {
      where.balance_type = balance_type;
    }

    if (start_time && end_time) {
      where.create_time = {
        [Op.between]: [ new Date(start_time), new Date(end_time) ],
      };
    }

    const include = [];

    // 操作员搜索 (操作员的名称或者id)
    const operatorInclude = {
      model: ctx.model.SysUser,
      as: 'operator',
      attributes: [ 'user_id', 'username', 'nickname' ],
      where: { shop_id }, // 限制只查询归属于本店铺的操作员的操作记录
    };
    if (operator_keyword) {
      operatorInclude.where[Op.or] = [
        { user_id: isNaN(Number(operator_keyword)) ? null : Number(operator_keyword) },
        { username: { [Op.like]: `%${operator_keyword}%` } },
        { nickname: { [Op.like]: `%${operator_keyword}%` } },
      ];
    }
    include.push(operatorInclude);

    // 用户搜索 (用户名称或者id)
    const userInclude = {
      model: ctx.model.SysUser,
      as: 'user',
      attributes: [ 'user_id', 'username', 'nickname' ],
    };
    if (keyword) {
      userInclude.where = {
        [Op.or]: [
          { user_id: isNaN(Number(keyword)) ? null : Number(keyword) },
          { username: { [Op.like]: `%${keyword}%` } },
          { nickname: { [Op.like]: `%${keyword}%` } },
        ],
      };
    }
    include.push(userInclude);

    const result = await ctx.model.UserWalletLog.findAndCountAll({
      where,
      include,
      order: [[ 'create_time', 'DESC' ]],
      limit,
      offset,
    });

    const formattedList = result.rows.map(item => {
      const operator = item.operator || {};
      const user = item.user || {};
      return {
        id: item.id,
        operator_id: item.operator_id,
        operator_name: operator.nickname || operator.username || '',
        user_id: item.user_id,
        user_name: user.nickname || user.username || '',
        balance_type: item.balance_type,
        amount: item.amount,
        remark: item.remark,
        create_time: item.create_time,
      };
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        total: result.count,
        list: formattedList,
      },
    };
  }

  // B端 人工加款(上分)
  async giveCreate() {
    const { ctx } = this;
    const { shop_id } = ctx.state.adminOuter || {};
    const operator_id = ctx.state.adminOuter ? ctx.state.adminOuter.user_id : null;
    const { target_c_user_id, user_id, give_amount, amount, remark, balance_type } = ctx.request.body;

    const final_user_id = user_id || target_c_user_id;
    const final_amount = amount || give_amount;
    const final_balance_type = balance_type || 2;

    ctx.assert(final_user_id, 422, '目标C端用户ID不能为空');
    ctx.assert(final_amount && Number(final_amount) > 0, 422, '加款金额必须大于0');

    // 校验该用户是否属于本店
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: final_user_id, shop_id },
    });
    if (!relation) ctx.throw(403, '该用户不属于当前店铺，无法操作');

    const customer = await ctx.model.SysUser.findOne({
      where: { user_id: final_user_id, user_type: 4 },
    });
    if (!customer) ctx.throw(404, 'C端客户不存在');

    let wallet = await ctx.model.UserWallet.findOne({ where: { user_id: final_user_id } });
    if (!wallet) {
      wallet = await ctx.model.UserWallet.create({ user_id: final_user_id });
    }

    const transaction = await ctx.model.transaction();
    try {
      const before_balance = Number(wallet.voucher_balance);
      const after_balance = before_balance + Number(final_amount);

      await wallet.increment('voucher_balance', { by: Number(final_amount), transaction });

      const log_no = `B_GV_${Date.now()}`;

      await ctx.model.UserWalletLog.create({
        user_id: final_user_id,
        operator_id,
        log_no,
        biz_type: 8, // 人工上分
        amount: Number(final_amount),
        balance_type: final_balance_type, // 1=代金资产
        before_balance,
        after_balance,
        remark: remark || '人工上分',
      }, { transaction });

      await transaction.commit();
      ctx.body = { code: 200, message: '加款成功' };
    } catch (error) {
      await transaction.rollback();
      ctx.throw(500, '加款失败：' + error.message);
    }
  }

  // B端 获取人工扣款(下分)记录列表
  async deductList() {
    const { ctx } = this;
    const { shop_id } = ctx.state.adminOuter || {};
    const { page = 1, page_size = 10, keyword, operator_keyword, balance_type, start_time, end_time } = ctx.query;
    const limit = Number(page_size);
    const offset = (Number(page) - 1) * limit;

    const { Op } = ctx.app.Sequelize;

    // 先查出该店铺下所有的C端用户ID
    const relations = await ctx.model.CustomerRelation.findAll({
      where: { shop_id },
      attributes: [ 'c_user_id' ],
    });
    const shopUserIds = relations.map(r => r.c_user_id);

    if (shopUserIds.length === 0) {
      ctx.body = { code: 200, message: '获取成功', data: { total: 0, list: [] } };
      return;
    }

    const where = {
      biz_type: 9, // 9 为人工下分
      user_id: { [Op.in]: shopUserIds },
    };

    if (balance_type) {
      where.balance_type = balance_type;
    }

    if (start_time && end_time) {
      where.create_time = {
        [Op.between]: [ new Date(start_time), new Date(end_time) ],
      };
    }

    const include = [];

    // 操作员搜索 (操作员的名称或者id)
    const operatorInclude = {
      model: ctx.model.SysUser,
      as: 'operator',
      attributes: [ 'user_id', 'username', 'nickname' ],
      where: { shop_id }, // 限制只查询归属于本店铺的操作员的操作记录
    };
    if (operator_keyword) {
      operatorInclude.where[Op.or] = [
        { user_id: isNaN(Number(operator_keyword)) ? null : Number(operator_keyword) },
        { username: { [Op.like]: `%${operator_keyword}%` } },
        { nickname: { [Op.like]: `%${operator_keyword}%` } },
      ];
    }
    include.push(operatorInclude);

    // 用户搜索 (用户名称或者id)
    const userInclude = {
      model: ctx.model.SysUser,
      as: 'user',
      attributes: [ 'user_id', 'username', 'nickname' ],
    };
    if (keyword) {
      userInclude.where = {
        [Op.or]: [
          { user_id: isNaN(Number(keyword)) ? null : Number(keyword) },
          { username: { [Op.like]: `%${keyword}%` } },
          { nickname: { [Op.like]: `%${keyword}%` } },
        ],
      };
    }
    include.push(userInclude);

    const result = await ctx.model.UserWalletLog.findAndCountAll({
      where,
      include,
      order: [[ 'create_time', 'DESC' ]],
      limit,
      offset,
    });

    const formattedList = result.rows.map(item => {
      const operator = item.operator || {};
      const user = item.user || {};
      return {
        id: item.id,
        operator_id: item.operator_id,
        operator_name: operator.nickname || operator.username || '',
        user_id: item.user_id,
        user_name: user.nickname || user.username || '',
        balance_type: item.balance_type,
        amount: item.amount,
        remark: item.remark,
        create_time: item.create_time,
      };
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        total: result.count,
        list: formattedList,
      },
    };
  }

  // B端 人工扣款(下分)
  async deductCreate() {
    const { ctx } = this;
    const { shop_id } = ctx.state.adminOuter || {};
    const { user_id, amount, remark } = ctx.request.body;
    const operator_id = ctx.state.adminOuter ? ctx.state.adminOuter.user_id : null;

    ctx.assert(user_id, 422, '目标C端用户ID不能为空');
    ctx.assert(amount && Number(amount) > 0, 422, '扣款金额必须大于0');

    // 校验该用户是否属于本店
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: user_id, shop_id },
    });
    if (!relation) ctx.throw(403, '该用户不属于当前店铺，无法操作');

    const customer = await ctx.model.SysUser.findOne({
      where: { user_id, user_type: 4 },
    });
    if (!customer) ctx.throw(404, 'C端客户不存在');

    const wallet = await ctx.model.UserWallet.findOne({ where: { user_id } });
    if (!wallet || Number(wallet.voucher_balance) < Number(amount)) {
      ctx.throw(400, '用户钱包余额不足，无法扣款');
    }

    const transaction = await ctx.model.transaction();
    try {
      await wallet.decrement('voucher_balance', { by: Number(amount), transaction });
      await ctx.model.UserWalletLog.create({
        user_id,
        operator_id,
        log_no: `B_DD_${Date.now()}`,
        biz_type: 9, // 人工下分
        amount: -Number(amount),
        balance_type: 4, // 假设 4=扣款
        before_balance: Number(wallet.voucher_balance),
        after_balance: Number(wallet.voucher_balance) - Number(amount),
        remark: remark || '人工下分',
      }, { transaction });

      await transaction.commit();
      ctx.body = { code: 200, message: '扣款成功' };
    } catch (error) {
      await transaction.rollback();
      ctx.throw(500, '扣款失败：' + error.message);
    }
  }
}

module.exports = AdminOuterPointsController;
