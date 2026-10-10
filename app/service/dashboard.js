'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');
const dayjs = require('dayjs');

class DashboardService extends Service {
  /**
   * 获取仪表盘统计数据
   * @param {number|null} shopId - 如果传了 shopId，则过滤该店铺的数据；否则统计全平台
   */
  async getStats(shopId = null) {
    const { ctx } = this;

    // 时间范围
    const todayStart = dayjs().startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const todayEnd = dayjs().endOf('day').format('YYYY-MM-DD HH:mm:ss');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD HH:mm:ss');
    const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD HH:mm:ss');

    const shopFilter = shopId ? { shop_id: shopId } : {};

    // 辅助方法：计算注册人数
    const getRegisterCount = async (startTime, endTime) => {
      if (shopId) {
        // B端：查询归属本店铺的C端用户数量
        return await ctx.model.CustomerRelation.count({
          where: {
            shop_id: shopId,
            create_time: {
              [Op.between]: [ startTime, endTime ],
            },
          },
        });
      }
      // A端：查询全平台C端用户数量
      return await ctx.model.SysUser.count({
        where: {
          user_type: 4,
          create_time: {
            [Op.between]: [ startTime, endTime ],
          },
        },
      });

    };

    // 辅助方法：获取充值金额 (仅统计真实充值 audit_type = 1)
    const getRechargeAmount = async (startTime, endTime) => {
      const whereCondition = {
        status: 2, // 2审核通过
        audit_type: 1, // 1真实充值
        audit_time: {
          [Op.between]: [ startTime, endTime ],
        },
      };

      if (shopId) {
        // 先查出该店铺下的所有用户
        const customers = await ctx.model.CustomerRelation.findAll({
          where: { shop_id: shopId },
          attributes: [ 'c_user_id' ],
          raw: true,
        });
        const userIds = customers.map(c => c.c_user_id);
        if (userIds.length === 0) return 0;
        whereCondition.user_id = { [Op.in]: userIds };
      }

      const sum = await ctx.model.UserRecharge.sum('amount', {
        where: whereCondition,
      });
      return Number(sum || 0);
    };

    // 辅助方法：获取充值人数 (仅统计真实充值 audit_type = 1)
    const getRechargeUserCount = async (startTime, endTime) => {
      const whereCondition = {
        status: 2, // 2审核通过
        audit_type: 1, // 1真实充值
        audit_time: {
          [Op.between]: [ startTime, endTime ],
        },
      };

      if (shopId) {
        // 先查出该店铺下的所有用户
        const customers = await ctx.model.CustomerRelation.findAll({
          where: { shop_id: shopId },
          attributes: [ 'c_user_id' ],
          raw: true,
        });
        const userIds = customers.map(c => c.c_user_id);
        if (userIds.length === 0) return 0;
        whereCondition.user_id = { [Op.in]: userIds };
      }

      // 为了防止数据库表非常大时 count 缓慢，这里使用了简单的 count，因为 Sequelize 的 findAndCountAll 或简单的 count 在大多数情况下都能较好地利用索引。
      const count = await ctx.model.UserRecharge.count({
        distinct: true,
        col: 'user_id',
        where: whereCondition,
      });
      return count || 0;
    };
    const getWithdrawAmount = async (startTime, endTime) => {
      const whereCondition = {
        status: 2, // 2审核通过
        audit_type: 1, // 1真实提现
        audit_time: {
          [Op.between]: [ startTime, endTime ],
        },
      };

      if (shopId) {
        const customers = await ctx.model.CustomerRelation.findAll({
          where: { shop_id: shopId },
          attributes: [ 'c_user_id' ],
          raw: true,
        });
        const userIds = customers.map(c => c.c_user_id);
        if (userIds.length === 0) return 0;
        whereCondition.user_id = { [Op.in]: userIds };
      }

      const sum = await ctx.model.UserWithdraw.sum('amount', {
        where: whereCondition,
      });
      return Number(sum || 0);
    };

    // 辅助方法：获取佣金数量 (biz_type = 4, 5)
    const getCommissionAmount = async (startTime, endTime) => {
      if (shopId) {
        // B端：需要关联 customer_relation 过滤 shop_id (由于 sys_user 直接关联可能报错，这里改用通过 c_user_id 过滤)
        // 先查出当前店铺下的所有用户 ID
        const customers = await ctx.model.CustomerRelation.findAll({
          where: { shop_id: shopId },
          attributes: [ 'c_user_id' ],
          raw: true,
        });
        const userIds = customers.map(c => c.c_user_id);

        if (userIds.length === 0) return 0;

        const sum = await ctx.model.UserWalletLog.sum('amount', {
          where: {
            user_id: { [Op.in]: userIds },
            biz_type: { [Op.in]: [ 4, 5 ] },
            create_time: {
              [Op.between]: [ startTime, endTime ],
            },
          },
        });
        return Number(sum || 0);
      }
      // A端：直接统计全部
      const sum = await ctx.model.UserWalletLog.sum('amount', {
        where: {
          biz_type: { [Op.in]: [ 4, 5 ] },
          create_time: {
            [Op.between]: [ startTime, endTime ],
          },
        },
      });
      return Number(sum || 0);

    };

    // --- 今日数据 ---
    const todayRegisterCount = await getRegisterCount(todayStart, todayEnd);
    const todayRechargeAmount = await getRechargeAmount(todayStart, todayEnd);
    const todayWithdrawAmount = await getWithdrawAmount(todayStart, todayEnd);
    const todayRechargeUserCount = await getRechargeUserCount(todayStart, todayEnd);

    // 首次充值人数与再次充值人数
    // 先获取商户下的所有用户
    let shopUserIds = [];
    if (shopId) {
      const customers = await ctx.model.CustomerRelation.findAll({
        where: { shop_id: shopId },
        attributes: [ 'c_user_id' ],
        raw: true,
      });
      shopUserIds = customers.map(c => c.c_user_id);
    }

    // 首次充值人数：今日内审核通过，且 is_first_recharge = 1，且 audit_type = 1 的独立用户数
    let firstRechargeWhere = {
      status: 2,
      audit_type: 1, // 只算真实的首次充值
      is_first_recharge: 1,
      audit_time: {
        [Op.between]: [ todayStart, todayEnd ],
      },
    };
    if (shopId) {
      if (shopUserIds.length === 0) {
        firstRechargeWhere = null; // 无用户则不查
      } else {
        firstRechargeWhere.user_id = { [Op.in]: shopUserIds };
      }
    }

    const todayFirstRechargeCount = firstRechargeWhere ? await ctx.model.UserRecharge.count({
      distinct: true,
      col: 'user_id',
      where: firstRechargeWhere,
    }) : 0;

    // 再次充值人数：今日内审核通过，且 is_first_recharge = 0，且 audit_type = 1 的独立用户数
    let repeatRechargeWhere = {
      status: 2,
      audit_type: 1, // 只算真实的再次充值
      is_first_recharge: 0,
      audit_time: {
        [Op.between]: [ todayStart, todayEnd ],
      },
    };
    if (shopId) {
      if (shopUserIds.length === 0) {
        repeatRechargeWhere = null;
      } else {
        repeatRechargeWhere.user_id = { [Op.in]: shopUserIds };
      }
    }

    const todayRepeatRechargeCount = repeatRechargeWhere ? await ctx.model.UserRecharge.count({
      distinct: true,
      col: 'user_id',
      where: repeatRechargeWhere,
    }) : 0;

    // --- 本月数据 ---
    const monthRechargeAmount = await getRechargeAmount(monthStart, monthEnd);
    const monthWithdrawAmount = await getWithdrawAmount(monthStart, monthEnd);

    return {
      today: {
        register_count: todayRegisterCount,
        recharge_amount: todayRechargeAmount,
        withdraw_amount: todayWithdrawAmount,
        recharge_user_count: todayRechargeUserCount,
        first_recharge_count: todayFirstRechargeCount,
        repeat_recharge_count: todayRepeatRechargeCount,
      },
      month: {
        recharge_amount: monthRechargeAmount,
        withdraw_amount: monthWithdrawAmount,
      },
    };
  }
}

module.exports = DashboardService;
