'use strict';

const Controller = require('egg').Controller;

class AdminOuterOrderController extends Controller {
  /**
   * B端获取订单列表
   */
  async index() {
    const { ctx, service } = this;
    const currentUser = ctx.state.adminOuter;

    if (!currentUser || !currentUser.user_id || !currentUser.shop_id) {
      ctx.throw(401, '登录状态异常，缺少必要信息');
    }

    try {
      const result = await service.adminOuterOrder.getOrderList(ctx.query, currentUser);
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[AdminOuterOrderController.index] 获取订单列表失败', error);
      ctx.body = {
        code: 500,
        message: '获取订单列表失败',
        data: null,
      };
    }
  }

  /**
   * B端获取订单详情(收益列表)
   */
  async show() {
    const { ctx, service } = this;
    const currentUser = ctx.state.adminOuter;
    const { id } = ctx.params;

    if (!currentUser || !currentUser.user_id || !currentUser.shop_id) {
      ctx.throw(401, '登录状态异常，缺少必要信息');
    }

    try {
      const result = await service.adminOuterOrder.getOrderDetail(id, currentUser);
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[AdminOuterOrderController.show] 获取订单详情失败', error);
      ctx.body = {
        code: error.status || 500,
        message: error.message || '获取订单详情失败',
        data: null,
      };
    }
  }
}

module.exports = AdminOuterOrderController;
