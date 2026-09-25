'use strict';

const Controller = require('egg').Controller;

class AdminOuterRechargeController extends Controller {
  /**
   * B端获取本店充值订单列表
   * GET /api/admin-outer/recharges
   */
  async index() {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    const { page = 1, page_size = 10, order_no, status, user_id, sales_user_id, channel_code, audit_type, start_time, end_time } = ctx.query;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const where = {
      shop_id: adminOuter.shop_id,
    };

    // 业务员只能看自己的
    if (adminOuter.user_type === 4) {
      where.sales_user_id = adminOuter.user_id;
    } else if (sales_user_id) {
      // 如果不是业务员，且传了业务员ID，则根据传的业务员ID过滤
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
    if (channel_code) {
      where.channel_code = channel_code;
    }
    if (audit_type !== undefined && audit_type !== '') {
      where.audit_type = parseInt(audit_type);
    }
    
    // 时间范围查询 (基于 create_time)
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

    // 格式化金额字段，去除多余的0
    const formattedList = result.rows.map(row => {
      const item = row.toJSON();
      if (item.amount) item.amount = Number(item.amount);
      if (item.fee_rate) item.fee_rate = Number(item.fee_rate);
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
   * 审核通过
   * POST /api/admin-outer/recharge/:id/audit-success
   */
  async auditSuccess() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { audit_type, operate_password } = ctx.request.body;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    if (!audit_type) {
      ctx.throw(400, '审核类型不能为空');
    }

    if (!operate_password) {
      ctx.throw(400, '操作密码不能为空');
    }

    // 校验操作密码
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

    // 业务员只能审核自己的
    if (adminOuter.user_type === 4 && recharge.sales_user_id !== adminOuter.user_id) {
      ctx.throw(403, '无权审核非本人名下的订单');
    }

    const transaction = await ctx.model.transaction();
    try {
      // 1. 更新订单状态
      await recharge.update({
        status: 2, // 2审核通过
        audit_type,
        audit_user_id: adminOuter.user_id,
        audit_time: new Date(),
      }, { transaction });

      // 2. 更新用户钱包
      const wallet = await ctx.model.UserWallet.findOne({
        where: { user_id: recharge.user_id },
        transaction,
      });

      if (!wallet) {
        await ctx.model.UserWallet.create({
          user_id: recharge.user_id,
          balance: recharge.user_receive_amount,
          total_recharge_amount: recharge.user_receive_amount,
        }, { transaction });
      } else {
        await wallet.increment({
          balance: recharge.user_receive_amount,
          total_recharge_amount: recharge.user_receive_amount,
        }, { transaction });
      }

      // 3. 记录流水
      const before_balance = wallet ? Number(wallet.balance) : 0;
      const after_balance = before_balance + Number(recharge.user_receive_amount);
      const log_no = `B_RA_${Date.now()}`;

      await ctx.model.UserWalletLog.create({
        user_id: recharge.user_id,
        log_no,
        biz_type: 1, // 充值
        related_id: recharge.id,
        amount: recharge.user_receive_amount,
        balance_type: 1, // 1=代金资产
        before_balance,
        after_balance,
        remark: 'B端充值审核通过',
      }, { transaction });

      // 4. 更新用户的充值状态 和 VIP 等级
      const user = await ctx.model.SysUser.findOne({ where: { user_id: recharge.user_id }, transaction });
      if (user) {
        let updateData = {};
        if (user.is_recharged === 0) {
          updateData.is_recharged = 1;
        }

        // 计算新的总充值金额
        const newTotalRecharge = (wallet ? Number(wallet.total_recharge_amount) : 0) + Number(recharge.user_receive_amount);
        
        // 查找 VIP 等级规则
        let vips = await ctx.model.ShopVipLevel.findAll({
          where: { shop_id: recharge.shop_id, is_enable: 1 },
          order: [[ 'need_total_recharge', 'DESC' ]],
          transaction,
        });
        
        if (!vips.length) {
          vips = await ctx.model.ShopVipLevel.findAll({
            where: { shop_id: 0, is_enable: 1 },
            order: [[ 'need_total_recharge', 'DESC' ]],
            transaction,
          });
        }

        let newVipLevel = user.vip_level;
        for (const vip of vips) {
          if (newTotalRecharge >= Number(vip.need_total_recharge)) {
            newVipLevel = vip.level;
            break;
          }
        }
        
        if (newVipLevel > user.vip_level) {
          updateData.vip_level = newVipLevel;
        }

        if (Object.keys(updateData).length > 0) {
          await user.update(updateData, { transaction });
        }
      }

      await transaction.commit();

      ctx.body = {
        code: 200,
        message: '审核通过成功',
      };
    } catch (error) {
      await transaction.rollback();
      ctx.logger.error('充值审核通过失败:', error);
      ctx.throw(500, '审核通过失败');
    }
  }

  /**
   * 审核驳回
   * POST /api/admin-outer/recharge/:id/audit-fail
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

    // 校验操作密码
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

    // 业务员只能审核自己的
    if (adminOuter.user_type === 4 && recharge.sales_user_id !== adminOuter.user_id) {
      ctx.throw(403, '无权审核非本人名下的订单');
    }

    await recharge.update({
      status: 3, // 3审核驳回
      reject_reason,
      audit_user_id: adminOuter.user_id,
      audit_time: new Date(),
    });

    ctx.body = {
      code: 200,
      message: '审核驳回成功',
    };
  }

  /**
   * 充值统计
   * GET /api/admin-outer/recharge/stats
   */
  async stats() {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const baseWhere = {
      shop_id: adminOuter.shop_id,
      status: 2, // 审核通过
    };

    // 业务员只能看自己的
    if (adminOuter.user_type === 4) {
      baseWhere.sales_user_id = adminOuter.user_id;
    }

    // 封装一个按日期区间获取统计数据的函数
    const getStatsByDate = async (startTime, endTime) => {
      const recharges = await ctx.model.UserRecharge.findAll({
        where: {
          ...baseWhere,
          audit_time: {
            [Op.gte]: startTime,
            [Op.lt]: endTime,
          },
        },
        include: [{
          model: ctx.model.SysUser,
          as: 'user',
          attributes: ['user_id', 'create_time'],
        }]
      });

      let recharge_amount = 0;
      let new_user_recharge_amount = 0;
      let old_user_recharge_amount = 0;

      const userSet = new Set();
      const newUserSet = new Set();
      const oldUserSet = new Set();

      for (const r of recharges) {
        const amount = Number(r.user_receive_amount) || 0;
        recharge_amount += amount;
        userSet.add(r.user_id);

        if (r.user && r.user.create_time) {
          const userCreateTime = new Date(r.user.create_time);
          // 判断用户注册时间是否在该区间内，如果是则为新用户
          if (userCreateTime >= startTime && userCreateTime < endTime) {
            new_user_recharge_amount += amount;
            newUserSet.add(r.user_id);
          } else {
            old_user_recharge_amount += amount;
            oldUserSet.add(r.user_id);
          }
        } else {
          old_user_recharge_amount += amount;
          oldUserSet.add(r.user_id);
        }
      }

      return {
        recharge_amount: recharge_amount.toFixed(2),
        recharge_users: userSet.size,
        new_user_recharge_amount: new_user_recharge_amount.toFixed(2),
        new_user_recharge_users: newUserSet.size,
        old_user_recharge_amount: old_user_recharge_amount.toFixed(2),
        old_user_recharge_users: oldUserSet.size,
      };
    };

    // 计算今日和昨日的时间区间
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);

    const todayStats = await getStatsByDate(todayStart, todayEnd);
    const yesterdayStats = await getStatsByDate(yesterdayStart, yesterdayEnd);

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        yesterday: yesterdayStats,
        today: todayStats,
      },
    };
  }
}

module.exports = AdminOuterRechargeController;
