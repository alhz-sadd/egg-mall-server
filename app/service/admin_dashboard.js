'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

/**
 * 管理端首页统计服务层
 */
class AdminDashboardService extends Service {
  /**
   * 获取今日日期字符串
   * @return {string} YYYY-MM-DD
   */
  getTodayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * 获取首页统计数据
   * @return {Object} 统计数据
   */
  async stats() {
    const { ctx } = this;
    const today = this.getTodayStr();

    // 今日注册人数
    const todayRegisterCount = await ctx.model.SysUser.count({
      where: {
        user_type: 4,
        status: 1,
        create_time: {
          [Op.gte]: `${today} 00:00:00`,
          [Op.lte]: `${today} 23:59:59`,
        },
      },
    });

    // 今日充值量（已通过）
    const todayRechargeAmount = await ctx.model.RechargeRecord.sum('amount', {
      where: { status: 1, recharge_date: today },
    });

    // 今日提现量（已通过）
    const todayWithdrawAmount = await ctx.model.WithdrawRecord.sum('amount', {
      where: { status: 1, withdraw_date: today },
    });

    // 今日业绩量：今日已通过充值总额 + 今日已通过提现总额
    const todayPerformanceAmount = Number(todayRechargeAmount || 0) + Number(todayWithdrawAmount || 0);

    // 今日首充会员数（今日有首充记录的用户去重）
    const firstRechargeUsers = await ctx.model.RechargeRecord.findAll({
      where: { recharge_type: 1, recharge_date: today, status: 1 },
      attributes: [ 'user_id' ],
      group: [ 'user_id' ],
      raw: true,
    });

    // 今日复充会员数（今日有复充记录的用户去重）
    const repeatRechargeUsers = await ctx.model.RechargeRecord.findAll({
      where: { recharge_type: 2, recharge_date: today, status: 1 },
      attributes: [ 'user_id' ],
      group: [ 'user_id' ],
      raw: true,
    });

    // 今日佣金量
    const todayCommissionAmount = await ctx.model.CommissionRecord.sum('amount', {
      where: { commission_date: today, status: 1 },
    });

    // 提现待审核数量
    const withdrawPendingCount = await ctx.model.WithdrawRecord.count({
      where: { status: 0 },
    });

    // 充值待审核数量
    const rechargePendingCount = await ctx.model.RechargeRecord.count({
      where: { status: 0 },
    });

    return {
      today_register_count: todayRegisterCount,
      today_recharge_amount: todayRechargeAmount || 0,
      today_withdraw_amount: todayWithdrawAmount || 0,
      today_performance_amount: todayPerformanceAmount,
      today_first_recharge_user_count: firstRechargeUsers.length,
      today_repeat_recharge_user_count: repeatRechargeUsers.length,
      today_commission_amount: todayCommissionAmount || 0,
      withdraw_pending_count: withdrawPendingCount,
      recharge_pending_count: rechargePendingCount,
    };
  }
}

module.exports = AdminDashboardService;
