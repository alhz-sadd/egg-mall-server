'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-订单
 * 移动端订单控制器
 */
class OrderController extends Controller {
  /**
   * @summary 创建订单
   * @description 创建商品订单
   * @router post /api/mobile/orders
   * @request header string Authorization Bearer token
   * @request body OrderCreateRequest *body 订单信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { address_id, product_id, quantity, remark } = ctx.request.body;

    ctx.assert(address_id, 422, '请选择收货地址');
    ctx.assert(product_id, 422, '请选择要购买的商品');
    ctx.assert(quantity > 0, 422, '购买数量必须大于0');

    const order = await service.order.create(userId, { address_id, product_id, quantity, remark });

    ctx.body = {
      code: 200,
      message: '订单创建成功',
      data: order,
    };
  }

  /**
   * @summary 获取订单列表
   * @description 获取当前登录用户的订单列表，支持状态筛选
   * @router get /api/mobile/orders
   * @request header string Authorization Bearer token
   * @request query integer status 订单状态
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 订单列表
   */
  async index() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { status, page, page_size } = ctx.query;

    const result = await service.order.list(userId, { status, page, page_size });

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取订单详情
   * @description 根据订单ID获取详情
   * @router get /api/mobile/orders/:id
   * @request header string Authorization Bearer token
   * @request path integer *id 订单ID
   * @response 200 ApiResponse 订单详情
   */
  async show() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { id } = ctx.params;

    const order = await service.order.detail(id, userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: order,
    };
  }

  /**
   * @summary 取消订单
   * @description 根据订单ID取消订单
   * @router put /api/mobile/orders/:id/cancel
   * @request header string Authorization Bearer token
   * @request path integer *id 订单ID
   * @response 200 ApiResponse 取消成功
   */
  async cancel() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { id } = ctx.params;

    const order = await service.order.cancel(id, userId);

    ctx.body = {
      code: 200,
      message: '订单取消成功',
      data: order,
    };
  }

  /**
   * @summary 模拟支付
   * @description 根据订单ID模拟支付
   * @router post /api/mobile/orders/:id/pay
   * @request header string Authorization Bearer token
   * @request path integer *id 订单ID
   * @response 200 ApiResponse 支付成功
   */
  /**
   * @summary 模拟支付
   * @description 根据订单ID模拟支付
   * @router post /api/mobile/orders/:id/pay
   * @request header string Authorization Bearer token
   * @request path integer *id 订单ID
   * @response 200 ApiResponse 支付成功
   */
  async pay() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { id } = ctx.params;

    const order = await service.order.pay(id, userId);

    ctx.body = {
      code: 200,
      message: '支付成功',
      data: order,
    };
  }

  /**
   * @summary 获取订单详情 (searchTask 配合接口)
   * @description 移动端获取订单详情，配合 searchTask 接口使用
   * @router post /api/mobile/orderMsg
   * @request header string Authorization Bearer token
   * @request body OrderMsgRequest *body
   * @response 200 ApiResponse 订单详情
   */
  async orderMsg() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { orderId } = ctx.request.body;

    ctx.assert(orderId, 422, '订单号不能为空');

    const orderMsg = await service.order.getOrderMsg(orderId, userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: orderMsg,
    };
  }

  /**
   * @summary 支付订单 (移动端)
   * @description 移动端支付订单，配合 finishOrder 接口使用
   * @router post /api/mobile/finishOrder
   * @request header string Authorization Bearer token
   * @request body FinishOrderRequest *body
   * @response 200 ApiResponse 支付成功
   */
  async finishOrder() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { orderId } = ctx.request.body;

    ctx.assert(orderId, 422, '订单号不能为空');

    const result = await service.order.pay(orderId, userId);

    ctx.body = {
      code: 200,
      message: '支付成功',
      data: result,
    };
  }
}

module.exports = OrderController;
