'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-提现
 * 移动端提现请求控制器
 */
class MobileWithdrawController extends Controller {
  /**
   * @summary 创建提现请求
   * @description 移动端用户发起提现请求
   * @router post /api/mobile/withdraws
   * @request header string Authorization Bearer token
   * @request body WithdrawCreateRequest *body 提现请求信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const userId = ctx.state.user.userId;

    const result = await service.withdraw.create(userId, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '提现请求已提交',
      data: result,
    };
  }

  /**
   * @summary 获取提现记录列表
   * @description 移动端用户查看自己的提现记录
   * @router get /api/mobile/withdraws
   * @request header string Authorization Bearer token
   * @request query integer status 状态（可选）
   * @request query integer page 页码，默认1
   * @request query integer pageSize 每页数量，默认10
   * @response 200 ApiResponse 提现记录列表
   */
  async list() {
    const { ctx, service } = this;
    const userId = ctx.state.user.userId;

    const result = await service.withdraw.mobileList(userId, ctx.query);

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: result,
    };
  }
}

module.exports = MobileWithdrawController;
