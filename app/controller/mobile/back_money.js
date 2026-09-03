'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-返款统计
 * 移动端返款统计控制器
 */
class BackMoneyController extends Controller {
  /**
   * @summary 获取用户返款
   * @description h5 用户 获取用户返款统计信息
   * @router get /api/mobile/getUserBackMoney
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 返款统计信息
   */
  async getUserBackMoney() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user; // userId 是 user_code 或 user_id (字符/数字)

    const result = await service.backMoney.getUserBackMoney(userId);

    ctx.body = {
      msg: '操作成功',
      code: 200,
      data: result,
      status: true,
    };
  }
}

module.exports = BackMoneyController;
