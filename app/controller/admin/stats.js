'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-业务统计
 * 管理端充值、提现等统计数据控制器
 */
class AdminStatsController extends Controller {
  /**
   * @summary 获取充值统计
   * @description 返回昨日和今日的充值统计，包括充值中总数、充值人数、充值金额、新用户/老用户充值金额与人数
   * @router get /api/admin/stats/recharge
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 充值统计
   */
  async recharge() {
    const { ctx, service } = this;
    const result = await service.stats.rechargeStats();

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取提现统计
   * @description 返回昨日和今日的提现统计，包括提现中总数、提现人数、提现金额
   * @router get /api/admin/stats/withdraw
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 提现统计
   */
  async withdraw() {
    const { ctx, service } = this;
    const result = await service.stats.withdrawStats();

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }
}

module.exports = AdminStatsController;
