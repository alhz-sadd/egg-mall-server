'use strict';

const Controller = require('egg').Controller;

class AdminOuterRechargeController extends Controller {
  /**
   * 充值统计(昨日与今日)
   */
  async stats() {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const baseWhere = { shop_id: adminOuter.shop_id };

    if (adminOuter.user_type === 4) {
      baseWhere.sales_user_id = adminOuter.user_id;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const getStats = async (startTime, endTime) => {
      const where = { ...baseWhere, create_time: { [Op.between]: [ startTime, endTime ] } };
      const pendingAmount = await ctx.model.UserRecharge.sum('amount', { where: { ...where, status: 1 } }) || 0;
      const successAmount = await ctx.model.UserRecharge.sum('amount', { where: { ...where, status: 2 } }) || 0;
      const totalUsers = await ctx.model.UserRecharge.count({
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
   * 获取充值列表
   */
  async index() {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    const { page = 1, page_size = 10, order_no, status, user_id, sales_user_id, start_time, end_time } = ctx.query;

    const adminOuter = ctx.state.adminOuter;
    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const where = {
      shop_id: adminOuter.shop_id,
    };

    const isShopOwner = adminOuter.user_type === 2;
    if (!isShopOwner) {
      where.sales_user_id = adminOuter.user_id;
    } else if (sales_user_id) {
      where.sales_user_id = sales_user_id;
    }

    if (order_no) {
      where.order_no = { [Op.like]: '%' + order_no + '%' };
    }
    if (status !== undefined && status !== '') {
      where.status = parseInt(status);
    }
    if (user_id) {
      where.user_id = user_id;
    }
    
    if (start_time || end_time) {
      where.create_time = {};
      if (start_time) {
        where.create_time[Op.gte] = new Date(start_time);
      }
      if (end_time) {
        where.create_time[Op.lte] = new Date(end_time);
      }
    }

    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;

    const result = await ctx.model.UserRecharge.findAndCountAll({
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

    const formattedList = result.rows.map(row => {
      const item = row.toJSON();
      if (item.amount) item.amount = Number(item.amount);
      if (item.fee) item.fee = Number(item.fee);
      if (item.system_receive_amount) item.system_receive_amount = Number(item.system_receive_amount);
      if (item.user_receive_amount) item.user_receive_amount = Number(item.user_receive_amount);
      return item;
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        list: formattedList,
        total: result.count,
        page: parseInt(page),
        page_size: limit,
      },
    };
  }

  /**
   * 充值审核通过
   */
  async auditSuccess() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { operate_password } = ctx.request.body;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    if (!operate_password) {
      ctx.throw(400, '操作密码不能为空');
    }

    const shopConfig = await ctx.model.ShopConfig.findOne({ where: { shop_id: adminOuter.shop_id } });
    if (!shopConfig || shopConfig.operate_password !== operate_password) {
      ctx.throw(400, '操作密码错误');
    }

    const recharge = await ctx.model.UserRecharge.findOne({
      where: { id, shop_id: adminOuter.shop_id },
    });

    if (!recharge) {
      ctx.throw(404, '充值订单不存在或无权操作');
    }

    if (recharge.status !== 1) {
      ctx.throw(400, '该订单不是待审核状态');
    }

    if (adminOuter.user_type === 4 && recharge.sales_user_id !== adminOuter.user_id) {
      ctx.throw(403, '无权审核非本人名下的订单');
    }

    const transaction = await ctx.model.transaction();
    try {
      await recharge.update({
        status: 2, // 2审核通过
        audit_user_id: adminOuter.user_id,
        audit_time: new Date(),
      }, { transaction });

      const wallet = await ctx.model.UserWallet.findOne({
        where: { user_id: recharge.user_id },
        transaction,
      });

      if (!wallet) {
        // 如果钱包不存在可以创建，这里假设钱包已经存在
        ctx.throw(400, '用户钱包不存在');
      }

      // 充值通过，增加用户余额
      await ctx.model.UserWallet.update({
        voucher_balance: ctx.app.Sequelize.literal(`voucher_balance + ${recharge.user_receive_amount}`),
        balance: ctx.app.Sequelize.literal(`balance + ${recharge.user_receive_amount}`),
        total_recharge_amount: ctx.app.Sequelize.literal(`total_recharge_amount + ${recharge.user_receive_amount}`)
      }, {
        where: { user_id: recharge.user_id },
        transaction
      });

      // 记录流水
      await ctx.model.UserWalletLog.create({
        user_id: recharge.user_id,
        operator_id: adminOuter.user_id,
        biz_type: 1, // 充值
        related_order_id: recharge.id,
        log_no: recharge.order_no + '_S',
        amount: recharge.user_receive_amount,
        balance_type: 1,
        before_balance: Number(wallet.balance),
        after_balance: Number(wallet.balance) + Number(recharge.user_receive_amount),
        remark: '充值审核通过',
      }, { transaction });

      await transaction.commit();

      ctx.body = {
        code: 200,
        message: '审核通过成功',
      };
    } catch (error) {
      await transaction.rollback();
      ctx.logger.error('充值审核通过失败:', error);
      ctx.throw(500, error.message || '审核通过失败');
    }
  }

  /**
   * 充值审核拒绝
   */
  async auditFail() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { reject_reason, operate_password } = ctx.request.body;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    if (!operate_password) {
      ctx.throw(400, '操作密码不能为空');
    }

    const shopConfig = await ctx.model.ShopConfig.findOne({ where: { shop_id: adminOuter.shop_id } });
    if (!shopConfig || shopConfig.operate_password !== operate_password) {
      ctx.throw(400, '操作密码错误');
    }

    const recharge = await ctx.model.UserRecharge.findOne({
      where: { id, shop_id: adminOuter.shop_id },
    });

    if (!recharge) {
      ctx.throw(404, '充值订单不存在或无权操作');
    }

    if (recharge.status !== 1) {
      ctx.throw(400, '该订单不是待审核状态');
    }

    if (adminOuter.user_type === 4 && recharge.sales_user_id !== adminOuter.user_id) {
      ctx.throw(403, '无权审核非本人名下的订单');
    }

    const transaction = await ctx.model.transaction();
    try {
      await recharge.update({
        status: 3, // 3审核驳回
        reject_reason,
        audit_user_id: adminOuter.user_id,
        audit_time: new Date(),
      }, { transaction });

      // 充值驳回不影响余额

      await transaction.commit();

      ctx.body = {
        code: 200,
        message: '审核驳回成功',
      };
    } catch (error) {
      await transaction.rollback();
      ctx.logger.error('充值审核驳回失败:', error);
      ctx.throw(500, error.message || '审核驳回失败');
    }
  }
}

module.exports = AdminOuterRechargeController;
