'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-提现方式
 * 移动端提现方式查询控制器
 */
class MobileWithdrawWayController extends Controller {
  /**
   * @summary 获取启用的提现方式列表
   * @description 移动端查询管理端已启用的提现方式列表，用于充值/提现时选择
   * @router get /api/mobile/withdraw-ways
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 提现方式列表
   */
  async index() {
    const { ctx, service } = this;

    const result = await service.withdrawWay.mobileList();

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }
}

module.exports = MobileWithdrawWayController;
