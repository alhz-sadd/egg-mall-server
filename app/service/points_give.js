'use strict';

const Service = require('egg').Service;

class PointsGiveService extends Service {
  async createGive(payload, operator) {
    const { ctx } = this;
    const { target_c_user_id, give_type = 1, give_amount, remark, balance_type } = payload;
    const { id: operator_user_id, shop_id } = operator;

    // 校验金额
    if (Number(give_amount) <= 0) {
      ctx.throw(400, '赠送金额必须大于0');
    }

    // 校验C用户是否存在并且属于当前店铺
    const cUser = await ctx.model.SysUser.findOne({
      where: { user_id: target_c_user_id, user_type: 4 },
    });
    if (!cUser) {
      ctx.throw(404, 'C端用户不存在');
    }
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: target_c_user_id, shop_id },
    });
    if (!relation) {
      ctx.throw(403, '该用户不属于您的店铺，无法进行上分操作');
    }

    // 开启事务
    const transaction = await ctx.model.transaction();
    try {
      // 1. 获取用户钱包
      let wallet = await ctx.model.UserWallet.findOne({ where: { user_id: target_c_user_id }, transaction });
      if (!wallet) {
        wallet = await ctx.model.UserWallet.create({ user_id: target_c_user_id }, { transaction });
      }

      // 2. 创建上分记录
      const giveRecord = await ctx.model.UserPointsGive.create({
        shop_id,
        operator_user_id,
        target_c_user_id,
        give_type,
        give_amount,
        balance_type,
        remark,
        status: 1,
      }, { transaction });

      // 3. 更新钱包金额 & 记录流水
      const { v4: uuidv4 } = require('uuid');
      const log_no = uuidv4().replace(/-/g, '');

      // 注意：这里需求是“其实都是记录到用户的代金金额内”，所以写死 voucher_balance
      const targetBalanceField = 'voucher_balance';

      const before_balance = Number(wallet[targetBalanceField]);
      const amount = Number(give_amount);
      const after_balance = before_balance + amount;

      // 增加余额
      await wallet.increment(targetBalanceField, { by: amount, transaction });
      await wallet.increment('balance', { by: amount, transaction });

      // 生成钱包流水
      const walletLog = await ctx.model.UserWalletLog.create({
        user_id: target_c_user_id,
        log_no,
        biz_type: 6, // 6: 资产扣减/增加 (人工)
        amount,
        balance_type: 1, // 对应 voucher_balance (代金资产)
        before_balance,
        after_balance,
        related_order_id: giveRecord.id,
        remark: '业务员上分赠送: ' + (remark || ''),
      }, { transaction });

      // 回填流水ID
      await giveRecord.update({ wallet_log_id: walletLog.id }, { transaction });

      // 4. 更新客户统计表冗余字段
      const stat = await ctx.model.CustomerStat.findOne({ where: { customer_user_id: target_c_user_id }, transaction });
      if (stat) {
        await stat.increment(targetBalanceField, { by: amount, transaction });
      } else {
        await ctx.model.CustomerStat.create({
          customer_user_id: target_c_user_id,
          [targetBalanceField]: amount,
        }, { transaction });
      }

      await transaction.commit();
      return giveRecord;
    } catch (err) {
      await transaction.rollback();
      ctx.logger.error('[PointsGiveService] 上分失败: ', err);
      ctx.throw(500, '上分操作失败: ' + err.message);
    }
  }

  async getList(query, shop_id = null) {
    const { ctx } = this;
    const { operator_user_id, target_c_user_id, give_type, start_time, end_time, page = 1, page_size = 20 } = query;

    const where = {};
    if (shop_id) where.shop_id = shop_id;
    if (operator_user_id) where.operator_user_id = operator_user_id;
    if (target_c_user_id) where.target_c_user_id = target_c_user_id;
    if (give_type) where.give_type = give_type;

    if (start_time && end_time) {
      const { Op } = app.Sequelize;
      where.create_time = {
        [Op.between]: [ new Date(start_time), new Date(end_time) ],
      };
    }

    const { count, rows } = await ctx.model.UserPointsGive.findAndCountAll({
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

module.exports = PointsGiveService;
