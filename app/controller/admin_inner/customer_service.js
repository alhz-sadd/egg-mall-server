'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-客服
 * 管理端客服控制器
 */
class CustomerServiceController extends Controller {
  /**
   * @summary 管理端客服列表
   * @description 管理员查看全部状态客服，支持关键词、状态筛选
   * @router get /api/admin-inner/customer-services
   * @request header string Authorization Bearer admin token
   * @request query string keyword 关键词（按名称模糊搜索）
   * @request query integer status 状态：1启用 0禁用
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 客服列表
   */
  async adminList() {
    const { ctx, service } = this;
    const list = await service.customerService.adminList(ctx.query);

    ctx.body = {
      code: 200,
      message: 'success',
      data: list,
    };
  }

  /**
   * @summary 创建客服
   * @description 创建新客服
   * @router post /api/admin-inner/customer-services
   * @request header string Authorization Bearer admin token
   * @request body CustomerServiceRequest *body 客服信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const customerService = await service.customerService.create(ctx.request.body);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: customerService,
    };
  }

  /**
   * @summary 更新客服
   * @description 根据客服ID更新信息
   * @router put /api/admin-inner/customer-services/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 客服ID
   * @request body CustomerServiceRequest *body 客服信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const customerService = await service.customerService.update(id, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: customerService,
    };
  }

  /**
   * @summary 删除客服
   * @description 根据客服ID软删除（状态改为禁用）
   * @router delete /api/admin-inner/customer-services/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 客服ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    await service.customerService.destroy(id);

    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }
}

module.exports = CustomerServiceController;
