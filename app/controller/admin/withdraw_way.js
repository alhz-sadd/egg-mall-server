'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-提现方式管理
 * 管理端提现方式的增删改查
 */
class AdminWithdrawWayController extends Controller {
  /**
   * @summary 获取提现方式列表
   * @description 管理端查询提现方式列表，支持按名称搜索和状态筛选
   * @router get /api/admin/withdraw-ways
   * @request header string Authorization Bearer admin token
   * @request query string keyword 提现方式名称关键词
   * @request query integer status 状态：0启用 1禁用
   * @request query integer page 页码 默认 1
   * @request query integer pageSize 每页数量 默认 10
   * @response 200 ApiResponse 提现方式列表
   */
  async index() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.withdrawWay.adminList(ctx.query, adminId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 添加提现方式
   * @description 管理端新增一条提现方式
   * @router post /api/admin/withdraw-ways
   * @request header string Authorization Bearer admin token
   * @request body WithdrawWayCreateRequest *body 提现方式信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.withdrawWay.adminCreate(ctx.request.body, adminId);

    ctx.body = {
      code: 200,
      message: '添加成功',
      data: result,
    };
  }

  /**
   * @summary 修改提现方式
   * @description 管理端更新指定提现方式
   * @router put /api/admin/withdraw-ways/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 提现方式ID
   * @request body WithdrawWayUpdateRequest *body 提现方式信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const result = await service.withdrawWay.adminUpdate(id, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: result,
    };
  }

  /**
   * @summary 删除提现方式
   * @description 管理端删除指定提现方式
   * @router delete /api/admin/withdraw-ways/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 提现方式ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    await service.withdrawWay.adminDestroy(id, adminId);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = AdminWithdrawWayController;
