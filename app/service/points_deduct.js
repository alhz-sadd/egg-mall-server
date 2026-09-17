'use strict';

const Service = require('egg').Service;

class PointsDeductService extends Service {
  async createDeduct(payload, operator) {
    const { ctx } = this;
    const { target_c_user_id, deduct_type, deduct_amount, reason } = payload;
    const { id: operator_user_id, shop_id } = operator;

    // 校验金额和原因
    if (Number(deduct_amount) <= 0) {
      ctx.throw(400, '扣减金额必须大于0');
    }
    if (!reason || !reason.trim()) {
      ctx.throw(400, '必须填写扣减原因');
    }

    // 校验C用户是否存在并且属于当前店铺
    const cUser = await ctx.model.SysUser.findOne({
      where: { id: target_c_user_id, user_type: 4 },
    });
    if (!cUser) {
      ctx.throw(404, 'C端用户不存在');
    }
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: target_c_user_id, shop_id },
    });
    if (!relation) {
      ctx.throw(403, '该用户不属于您的店铺，无法进行扣减操作');
    }

    // 开启事务
    const transaction = await ctx.model.transaction();
    try {
      // 1. 获取用户钱包
      const wallet = await ctx.model.UserWallet.findOne({ where: { user_id: target_c_user_id }, transaction });
      if (!wallet) {
        ctx.throw(400, '用户钱包不存在，无法扣减');
      }

      let balanceField = '';
      if (deduct_type === 1) balanceField = 'voucher_balance';
      else if (deduct_type === 2) balanceField = 'static_income';
      else if (deduct_type === 3) balanceField = 'dynamic_income';
      else throw new Error('未知的扣减资产类型');

      const before_balance = Number(wallet[balanceField]);
      const amount = Number(deduct_amount);

      // 校验余额是否足够
      if (before_balance < amount) {
        ctx.throw(400, `当前资产余额不足，可用余额: ${before_balance}，无法扣减: ${amount}`);
      }

      const after_balance = before_balance - amount;

      // 2. 创建扣减记录
      const deductRecord = await ctx.model.UserPointsDeduct.create({
        shop_id,
        operator_user_id,
        target_c_user_id,
        deduct_type,
        deduct_amount: amount,
        reason,
        status: 1,
      }, { transaction });

      // 3. 扣减钱包金额 & 记录流水
      await wallet.decrement(balanceField, { by: amount, transaction });
      if (balanceField === 'voucher_balance') {
        await wallet.decrement('balance', { by: amount, transaction });
      }

      const { v4: uuidv4 } = require('uuid');
      const log_no = uuidv4().replace(/-/g, '');

      const walletLog = await ctx.model.UserWalletLog.create({
        user_id: target_c_user_id,
        log_no,
        biz_type: 6, // 6: 资产扣减/增加 (人工)
        amount: -amount, // 存负数
        balance_type: deduct_type,
        before_balance,
        after_balance,
        related_order_id: deductRecord.id,
        remark: '人工扣减: ' + reason,
      }, { transaction });

      // 回填流水ID
      await deductRecord.update({ wallet_log_id: walletLog.id }, { transaction });

      // 4. 更新客户统计表冗余字段
      const stat = await ctx.model.CustomerStat.findOne({ where: { c_user_id: target_c_user_id, shop_id }, transaction });
      if (stat) {
        // 为了防止冗余字段扣成负数，这里也做个保底
        const currentStat = Number(stat[balanceField]);
        if (currentStat >= amount) {
          await stat.decrement(balanceField, { by: amount, transaction });
        } else {
          await stat.update({ [balanceField]: 0 }, { transaction });
        }
      }

      // 5. 记录系统操作日志
      await ctx.service.sysOperationLog.record({
        user_id: operator_user_id,
        shop_id,
        module: '资金管理',
        action: '人工扣减',
        content: `给C端用户(ID:${target_c_user_id})扣减资产(类型:${deduct_type}) 金额:${amount} 原因:${reason}`,
        ip: ctx.ip,
      }, transaction);

      await transaction.commit();
      return deductRecord;
    } catch (err) {
      await transaction.rollback();
      ctx.logger.error('[PointsDeductService] 扣减失败: ', err);
      if (err.status) throw err; // 抛出自定义HTTP错误
      ctx.throw(500, '扣减操作失败: ' + err.message);
    }
  }

  async getList(query, shop_id = null) {
    const { ctx } = this;
    const { operator_user_id, target_c_user_id, deduct_type, start_time, end_time, page = 1, page_size = 20 } = query;

    const where = {};
    if (shop_id) where.shop_id = shop_id;
    if (operator_user_id) where.operator_user_id = operator_user_id;
    if (target_c_user_id) where.target_c_user_id = target_c_user_id;
    if (deduct_type) where.deduct_type = deduct_type;

    if (start_time && end_time) {
      const { Op } = app.Sequelize;
      where.create_time = {
        [Op.between]: [ new Date(start_time), new Date(end_time) ],
      };
    }

    const { count, rows } = await ctx.model.UserPointsDeduct.findAndCountAll({
      where,
      limit: Number(page_size),
      offset: (Number(page) - 1) * Number(page_size),
      order: [[ 'create_time', 'DESC' ]],
      include: [
        { model: ctx.model.SysUser, as: 'operator', attributes: [ 'user_id', 'username', 'nickname' ] },
        { model: ctx.model.SysUser, as: 'targetUser', attributes: [ 'user_id', 'username', 'phone' ] },
      ],
    });

    return {
      total: count,
      list: rows,
      page: Number(page),
      page_size: Number(page_size),
    };
  }
}

module.exports = PointsDeductService;
