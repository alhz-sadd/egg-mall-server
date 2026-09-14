'use strict';

const Controller = require('egg').Controller;

class AdminOuterWithdrawController extends Controller {
  /**
   * 提现统计(昨日与今日)
   */
  async stats() {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const baseWhere = { shop_id: adminOuter.shop_id };

    // 业务员只能看自己的
    if (adminOuter.user_type === 4) {
      baseWhere.sales_user_id = adminOuter.user_id;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const getStats = async (startTime, endTime) => {
      const where = { ...baseWhere, create_time: { [Op.between]: [ startTime, endTime ] } };
      const pendingAmount = await ctx.model.UserWithdraw.sum('amount', { where: { ...where, status: 1 } }) || 0;
      const successAmount = await ctx.model.UserWithdraw.sum('amount', { where: { ...where, status: 2 } }) || 0;
      const totalUsers = await ctx.model.UserWithdraw.count({
        where,
        distinct: true,
        col: 'user_id',
      });
      return { pending_amount: Number(pendingAmount).toFixed(2), success_amount: Number(successAmount).toFixed(2), total_users: totalUsers };
    };

    const todayStats = await getStats(todayStart, new Date());
    const yesterdayStats = await getStats(yesterdayStart, todayStart);

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        today: todayStats,
        yesterday: yesterdayStats,
      },
    };
  }

  /**
   * 获取提现列表
   */
  async index() {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    const { page = 1, page_size = 10, order_no, status, user_id, type } = ctx.query;

    const adminOuter = ctx.state.adminOuter;
    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const where = {
      shop_id: adminOuter.shop_id,
    };

    if (order_no) {
      where.order_no = { [Op.like]: '%' + order_no + '%' };
    }
    if (status !== undefined && status !== '') {
      where.status = parseInt(status);
    }
    if (user_id) {
      where.user_id = user_id;
    }
    if (type) {
      where.type = type;
    }

    // 如果不是店长，只能看自己发展的用户的提现
    const isShopOwner = adminOuter.user_type === 2;
    if (!isShopOwner) {
      where.sales_user_id = adminOuter.user_id;
    }

    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;

    const result = await ctx.model.UserWithdraw.findAndCountAll({
      where,
      limit,
      offset,
      order: [[ 'create_time', 'DESC' ]],
      include: [
        {
          model: ctx.model.SysUser,
          as: 'user',
          attributes: [ 'user_id', 'username', 'nickname' ],
        },
        {
          model: ctx.model.SysUser,
          as: 'sales_user',
          attributes: [ 'user_id', 'username', 'nickname' ],
        },
      ],
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        list: result.rows,
        total: result.count,
        page: parseInt(page),
        page_size: limit,
      },
    };
  }

  /**
   * 修改提现地址
   * PUT /api/admin-outer/withdraw/:id/address
   */
  async updateAddress() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { withdraw_address } = ctx.request.body;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    if (!withdraw_address) {
      ctx.throw(400, '新的提现地址不能为空');
    }

    const withdraw = await ctx.model.UserWithdraw.findOne({
      where: { id, shop_id: adminOuter.shop_id },
    });

    if (!withdraw) {
      ctx.throw(404, '提现订单不存在或无权操作');
    }

    if (withdraw.status !== 1) {
      ctx.throw(400, '该订单不是待审核状态，无法修改地址');
    }

    if (adminOuter.user_type === 4 && withdraw.sales_user_id !== adminOuter.user_id) {
      ctx.throw(403, '无权操作非本人名下的订单');
    }

    await withdraw.update({ withdraw_address });

    ctx.body = {
      code: 200,
      message: '修改成功',
    };
  }

  /**
   * 提现审核通过
   */
  async auditSuccess() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { audit_type } = ctx.request.body;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    if (!audit_type) {
      ctx.throw(400, '审核类型不能为空');
    }

    const withdraw = await ctx.model.UserWithdraw.findOne({
      where: { id, shop_id: adminOuter.shop_id },
    });

    if (!withdraw) {
      ctx.throw(404, '提现订单不存在或无权操作');
    }

    if (withdraw.status !== 1) {
      ctx.throw(400, '该订单不是待审核状态');
    }

    if (adminOuter.user_type === 4 && withdraw.sales_user_id !== adminOuter.user_id) {
      ctx.throw(403, '无权审核非本人名下的订单');
    }

    const transaction = await ctx.model.transaction();
    try {
      // 1. 更新订单状态
      await withdraw.update({
        status: 2, // 2审核通过
        audit_type,
        audit_user_id: adminOuter.user_id,
        audit_time: new Date(),
      }, { transaction });

      // 2. 扣除冻结资产，并累加到已提现金额
      const wallet = await ctx.model.UserWallet.findOne({
        where: { user_id: withdraw.user_id },
        transaction,
      });

      if (wallet) {
        if (wallet.freeze_voucher_balance < withdraw.amount) {
          throw new Error('用户冻结资产不足，无法通过');
        }
        await wallet.decrement('freeze_voucher_balance', {
          by: withdraw.amount,
          transaction,
        });
        await wallet.increment('total_withdraw_amount', {
          by: withdraw.amount,
          transaction,
        });
      }

      // 3. 记录流水
      await ctx.model.UserWalletLog.create({
        user_id: withdraw.user_id,
        biz_type: 2, // 提现
        biz_id: withdraw.id,
        biz_no: withdraw.order_no,
        amount: -withdraw.amount,
        balance_type: 'freeze_voucher_balance',
        remark: '提现审核通过',
      }, { transaction });

      await transaction.commit();

      ctx.body = {
        code: 200,
        message: '审核通过成功',
      };
    } catch (error) {
      await transaction.rollback();
      ctx.logger.error('提现审核通过失败:', error);
      ctx.throw(500, error.message || '审核通过失败');
    }
  }

  /**
   * 提现审核拒绝
   */
  async auditFail() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { reject_reason } = ctx.request.body;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    if (!reject_reason) {
      ctx.throw(400, '驳回原因不能为空');
    }

    const withdraw = await ctx.model.UserWithdraw.findOne({
      where: { id, shop_id: adminOuter.shop_id },
    });

    if (!withdraw) {
      ctx.throw(404, '提现订单不存在或无权操作');
    }

    if (withdraw.status !== 1) {
      ctx.throw(400, '该订单不是待审核状态');
    }

    if (adminOuter.user_type === 4 && withdraw.sales_user_id !== adminOuter.user_id) {
      ctx.throw(403, '无权审核非本人名下的订单');
    }

    const transaction = await ctx.model.transaction();
    try {
      // 1. 更新订单状态
      await withdraw.update({
        status: 3, // 3审核驳回
        reject_reason,
        audit_user_id: adminOuter.user_id,
        audit_time: new Date(),
      }, { transaction });

      // 2. 将冻结的金额退回到可用余额
      const wallet = await ctx.model.UserWallet.findOne({
        where: { user_id: withdraw.user_id },
        transaction,
      });

      if (wallet) {
        await wallet.decrement('freeze_voucher_balance', {
          by: withdraw.amount,
          transaction,
        });
        await wallet.increment('voucher_balance', {
          by: withdraw.amount,
          transaction,
        });
      }

      // 3. 记录流水
      await ctx.model.UserWalletLog.create({
        user_id: withdraw.user_id,
        biz_type: 2, // 提现
        biz_id: withdraw.id,
        biz_no: withdraw.order_no,
        amount: withdraw.amount,
        balance_type: 'voucher_balance',
        remark: '提现驳回，资金退回',
      }, { transaction });

      await transaction.commit();

      ctx.body = {
        code: 200,
        message: '审核驳回成功',
      };
    } catch (error) {
      await transaction.rollback();
      ctx.logger.error('提现审核驳回失败:', error);
      ctx.throw(500, error.message || '审核驳回失败');
    }
  }
}

module.exports = AdminOuterWithdrawController;
