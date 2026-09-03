'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-客服
 * 移动端客服控制器
 */
class CustomerServiceController extends Controller {
  /**
   * @summary 获取客服列表
   * @description 移动端客服列表，仅返回启用状态（status=1），支持关键词搜索
   * @router get /api/mobile/customer-services
   * @request query string keyword 关键词（按名称模糊搜索）
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 客服列表
   */
  async index() {
    const { ctx, service } = this;
    const list = await service.customerService.list(ctx.query);

    ctx.body = {
      code: 200,
      message: 'success',
      data: list,
    };
  }

  /**
   * @summary 获取客服详情
   * @description 根据客服ID获取详情
   * @router get /api/mobile/customer-services/:id
   * @request path integer *id 客服ID
   * @response 200 ApiResponse 客服详情
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const customerService = await service.customerService.detail(id);

    ctx.body = {
      code: 200,
      message: 'success',
      data: customerService,
    };
  }
}

module.exports = CustomerServiceController;
