'use strict';

const Service = require('egg').Service;

/**
 * 统计服务层
 * 处理管理端充值、提现等业务统计
 */
class StatsService extends Service {
  /**
   * 获取北京时间的某一天起止时间（UTC）
   * @param {number} daysAgo 0=今天 1=昨天
   * @return {Object} { start, end }
   */
  getBeijingDateRange(daysAgo = 0) {
    const now = new Date();
    // 当前北京时间
    const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const year = beijingNow.getUTCFullYear();
    const month = beijingNow.getUTCMonth();
    const date = beijingNow.getUTCDate() - daysAgo;

    // 北京时间 00:00:00 对应 UTC 前一天的 16:00:00
    const start = new Date(Date.UTC(year, month, date, -8, 0, 0, 0));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { start, end };
  }

  /**
   * 统计某一天的充值数据
   * @param {number} daysAgo 0=今天 1=昨天
   * @return {Object} 充值统计
   */
  async getRechargeDayStats(daysAgo = 0) {
    const { ctx } = this;
    const { Op } = ctx.app.Sequelize;
    const { start, end } = this.getBeijingDateRange(daysAgo);

    // 充值中总数
    const pendingCount = await ctx.model.RechargeRequest.count({
      where: {
        status: 0,
        created_at: { [Op.gte]: start, [Op.lte]: end },
      },
    });

    // 成功充值记录
    const successRecords = await ctx.model.RechargeRequest.findAll({
      where: {
        status: 1,
        created_at: { [Op.gte]: start, [Op.lte]: end },
      },
      attributes: [ 'user_id', 'do_money' ],
    });

    const userMoneyMap = new Map();
    let totalAmount = 0;
    for (const record of successRecords) {
      const uid = record.user_id;
      const money = Number(record.do_money);
      totalAmount += money;
      if (!userMoneyMap.has(uid)) {
        userMoneyMap.set(uid, 0);
      }
      userMoneyMap.set(uid, userMoneyMap.get(uid) + money);
    }

    const userIds = Array.from(userMoneyMap.keys());
    const totalUsers = userIds.length;

    // 区分新老用户：查询这些用户中在目标日期前是否有成功充值
    let oldUserIds = new Set();
    if (userIds.length > 0) {
      const oldRecords = await ctx.model.RechargeRequest.findAll({
        where: {
          status: 1,
          user_id: { [Op.in]: userIds },
          created_at: { [Op.lt]: start },
        },
        attributes: [ 'user_id' ],
        group: [ 'user_id' ],
        raw: true,
      });
      oldUserIds = new Set(oldRecords.map(r => r.user_id));
    }

    let newAmount = 0;
    let newUsers = 0;
    let oldAmount = 0;
    let oldUsers = 0;

    for (const [ uid, money ] of userMoneyMap.entries()) {
      if (oldUserIds.has(uid)) {
        oldAmount += money;
        oldUsers += 1;
      } else {
        newAmount += money;
        newUsers += 1;
      }
    }

    const prefix = daysAgo === 0 ? 'today' : 'yesterday';
    return {
      [`${prefix}_pending_count`]: pendingCount,
      [`${prefix}_user_count`]: totalUsers,
      [`${prefix}_amount`]: Number(totalAmount.toFixed(2)),
      [`${prefix}_new_user_amount`]: Number(newAmount.toFixed(2)),
      [`${prefix}_new_user_count`]: newUsers,
      [`${prefix}_old_user_amount`]: Number(oldAmount.toFixed(2)),
      [`${prefix}_old_user_count`]: oldUsers,
    };
  }

  /**
   * 统计某一天的提现数据
   * @param {number} daysAgo 0=今天 1=昨天
   * @return {Object} 提现统计
   */
  async getWithdrawDayStats(daysAgo = 0) {
    const { ctx } = this;
    const { Op } = ctx.app.Sequelize;
    const { start, end } = this.getBeijingDateRange(daysAgo);

    // 提现中总数
    const pendingCount = await ctx.model.WithdrawRecord.count({
      where: {
        status: 0,
        created_at: { [Op.gte]: start, [Op.lte]: end },
      },
    });

    // 成功提现记录
    const successRecords = await ctx.model.WithdrawRecord.findAll({
      where: {
        status: 1,
        created_at: { [Op.gte]: start, [Op.lte]: end },
      },
      attributes: [ 'user_id', 'take_money' ],
    });

    const userIds = new Set();
    let totalAmount = 0;
    for (const record of successRecords) {
      userIds.add(record.user_id);
      totalAmount += Number(record.take_money);
    }

    const prefix = daysAgo === 0 ? 'today' : 'yesterday';
    return {
      [`${prefix}_pending_count`]: pendingCount,
      [`${prefix}_user_count`]: userIds.size,
      [`${prefix}_amount`]: Number(totalAmount.toFixed(2)),
    };
  }

  /**
   * 获取充值统计
   * @return {Object} 昨日 + 今日充值统计
   */
  async rechargeStats() {
    const yesterday = await this.getRechargeDayStats(1);
    const today = await this.getRechargeDayStats(0);
    return { ...yesterday, ...today };
  }

  /**
   * 获取提现统计
   * @return {Object} 昨日 + 今日提现统计
   */
  async withdrawStats() {
    const yesterday = await this.getWithdrawDayStats(1);
    const today = await this.getWithdrawDayStats(0);
    return { ...yesterday, ...today };
  }
}

module.exports = StatsService;
