'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-充值请求
 * 移动端充值请求控制器
 */
class MobileRechargeController extends Controller {
  /**
   * @summary 创建充值请求
   * @description 移动端用户发起充值请求
   * @router post /api/mobile/recharges
   * @request header string Authorization Bearer token
   * @request body RechargeRequest *body 充值请求信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const userId = ctx.state.user.userId;

    const result = await service.rechargeRequest.create(userId, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '充值请求已提交',
      data: result,
    };
  }

  /**
   * @summary 获取充值记录列表
   * @description 移动端用户查看自己的充值记录
   * @router get /api/mobile/recharges
   * @request header string Authorization Bearer token
   * @request query integer status 状态（可选）
   * @request query integer page 页码，默认1
   * @request query integer pageSize 每页数量，默认10
   * @response 200 ApiResponse 充值记录列表
   */
  async list() {
    const { ctx, service } = this;
    const userId = ctx.state.user.userId;

    const result = await service.rechargeRequest.mobileList(userId, ctx.query);

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: result,
    };
  }

  /**
   * @summary 获取充值地址
   * @description 移动端用户获取充值地址（即所属业务员设置的充值地址）
   * @router get /api/mobile/recharge-address
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 充值地址信息
   */
  async address() {
    const { ctx, service } = this;
    const userId = ctx.state.user.userId;

    const result = await service.rechargeRequest.getRechargeAddress(userId);

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: result,
    };
  }
}

module.exports = MobileRechargeController;
