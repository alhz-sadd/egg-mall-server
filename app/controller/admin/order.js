'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-订单管理
 * 管理端订单列表控制器
 */
class AdminOrderController extends Controller {
  /**
   * @summary 获取订单列表
   * @description 管理端查询订单列表，支持按UID、用户UID、订单号、状态、时间筛选
   * @router get /api/admin/orders
   * @request header string Authorization Bearer admin token
   * @request query integer uid 订单UID
   * @request query integer user_uid 用户UID
   * @request query string order_no 订单号
   * @request query integer status 状态：0待支付 1已支付 2已发货 3已完成 4已取消
   * @request query string start_time 开始时间
   * @request query string end_time 结束时间
   * @request query integer page 页码 默认 1
   * @request query integer pageSize 每页数量 默认 10
   * @response 200 ApiResponse 订单列表
   */
  async index() {
    const { ctx, service } = this;
    const result = await service.order.adminList(ctx.query);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 删除订单
   * @description 管理端删除指定订单及其商品项（物理删除）
   * @router delete /api/admin/orders/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 订单ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    await service.order.adminDestroy(id, adminId);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = AdminOrderController;
