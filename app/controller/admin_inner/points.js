'use strict';

const Controller = require('egg').Controller;

class AdminInnerPointsController extends Controller {
  // A端 获取人工加款(上分)记录列表
  async giveList() {
    const { ctx } = this;
    const { page = 1, page_size = 10, username, user_id, start_time, end_time } = ctx.query;
    const limit = Number(page_size);
    const offset = (Number(page) - 1) * limit;

    const { Op } = ctx.app.Sequelize;
    const where = { biz_type: 7 }; // 7 为系统增加

    if (user_id) where.user_id = user_id;
    if (start_time && end_time) {
      where.create_time = {
        [Op.between]: [ new Date(start_time), new Date(end_time) ],
      };
    }

    const include = [];
    include.push({
      model: ctx.model.SysUser,
      as: 'operator',
      attributes: [ 'user_id', 'username', 'nickname' ],
    });

    if (username) {
      include.push({
        model: ctx.model.SysUser,
        as: 'user',
        where: { username: { [Op.like]: `%${username}%` } },
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    } else {
      include.push({
        model: ctx.model.SysUser,
        as: 'user',
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    }

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

  // A端 人工加款(上分)
  async giveCreate() {
    const { ctx } = this;
    const { user_id, amount, remark, balance_type } = ctx.request.body;
    const operator_id = ctx.state.adminInner ? ctx.state.adminInner.adminInnerId : null;

    ctx.assert(user_id, 422, '目标C端用户ID不能为空');
    ctx.assert(amount && Number(amount) > 0, 422, '加款金额必须大于0');

    const customer = await ctx.model.SysUser.findOne({
      where: { user_id, user_type: 4 },
    });
    if (!customer) ctx.throw(404, 'C端客户不存在');

    let wallet = await ctx.model.UserWallet.findOne({ where: { user_id } });
    if (!wallet) {
      wallet = await ctx.model.UserWallet.create({ user_id });
    }

    const transaction = await ctx.model.transaction();
    try {
      await wallet.increment('voucher_balance', { by: Number(amount), transaction });
      await wallet.increment('balance', { by: Number(amount), transaction });
      await ctx.model.UserWalletLog.create({
        user_id,
        operator_id,
        log_no: `A_GV_${Date.now()}`,
        biz_type: 7, // 系统增加
        amount: Number(amount),
        balance_type: balance_type || 1, // 1=增送客户
        before_balance: Number(wallet.voucher_balance),
        after_balance: Number(wallet.voucher_balance) + Number(amount),
        remark: remark || 'A端人工上分',
      }, { transaction });

      await transaction.commit();
      ctx.body = { code: 200, message: '加款成功' };
    } catch (error) {
      await transaction.rollback();
      ctx.throw(500, '加款失败：' + error.message);
    }
  }

  // A端 获取人工扣款(下分)记录列表
  async deductList() {
    const { ctx } = this;
    const { page = 1, page_size = 10, username, user_id, start_time, end_time } = ctx.query;
    const limit = Number(page_size);
    const offset = (Number(page) - 1) * limit;

    const { Op } = ctx.app.Sequelize;
    const where = { biz_type: 6 }; // 6 为系统减少

    if (user_id) where.user_id = user_id;
    if (start_time && end_time) {
      where.create_time = {
        [Op.between]: [ new Date(start_time), new Date(end_time) ],
      };
    }

    const include = [];
    include.push({
      model: ctx.model.SysUser,
      as: 'operator',
      attributes: [ 'user_id', 'username', 'nickname' ],
    });

    if (username) {
      include.push({
        model: ctx.model.SysUser,
        as: 'user',
        where: { username: { [Op.like]: `%${username}%` } },
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    } else {
      include.push({
        model: ctx.model.SysUser,
        as: 'user',
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    }

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

  // A端 人工扣款(下分)
  async deductCreate() {
    const { ctx } = this;
    const { user_id, amount, remark } = ctx.request.body;
    const operator_id = ctx.state.adminInner ? ctx.state.adminInner.adminInnerId : null;

    ctx.assert(user_id, 422, '目标C端用户ID不能为空');
    ctx.assert(amount && Number(amount) > 0, 422, '扣款金额必须大于0');

    const customer = await ctx.model.SysUser.findOne({
      where: { user_id, user_type: 4 },
    });
    if (!customer) ctx.throw(404, 'C端客户不存在');

    const wallet = await ctx.model.UserWallet.findOne({ where: { user_id } });
    if (!wallet || Number(wallet.balance) < Number(amount)) {
      ctx.throw(400, '用户钱包余额不足，无法扣款');
    }

    const transaction = await ctx.model.transaction();
    try {
      const currentRecharge = Number(wallet.recharge_balance || 0);
      let deductRecharge = 0;
      let deductVoucher = 0;
      if (currentRecharge >= Number(amount)) {
        deductRecharge = Number(amount);
      } else {
        deductRecharge = currentRecharge;
        deductVoucher = Number(amount) - currentRecharge;
      }

      await ctx.model.UserWallet.update({
        balance: ctx.app.Sequelize.literal(`balance - ${amount}`),
        recharge_balance: ctx.app.Sequelize.literal(`recharge_balance - ${deductRecharge}`),
        voucher_balance: ctx.app.Sequelize.literal(`voucher_balance - ${deductVoucher}`)
      }, {
        where: { user_id },
        transaction
      });
      await ctx.model.UserWalletLog.create({
        user_id,
        operator_id,
        log_no: `A_DD_${Date.now()}`,
        biz_type: 6, // 系统减少
        amount: -Number(amount),
        balance_type: 4, // 扣款
        before_balance: Number(wallet.voucher_balance),
        after_balance: Number(wallet.voucher_balance) - Number(amount),
        remark: remark || 'A端人工下分',
      }, { transaction });

      await transaction.commit();
      ctx.body = { code: 200, message: '扣款成功' };
    } catch (error) {
      await transaction.rollback();
      ctx.throw(500, '扣款失败：' + error.message);
    }
  }
}

module.exports = AdminInnerPointsController;
