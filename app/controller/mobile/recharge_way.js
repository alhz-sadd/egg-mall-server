'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-充值方式
 * 移动端充值方式查询控制器
 */
class MobileRechargeWayController extends Controller {
  /**
   * @summary 获取启用的充值方式列表
   * @description 移动端查询管理端已启用的充值方式列表，用于充值时选择
   * @router get /api/mobile/recharge-ways
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 充值方式列表
   */
  async index() {
    const { ctx, service } = this;

    const result = await service.rechargeWay.mobileList();

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }
}

module.exports = MobileRechargeWayController;
