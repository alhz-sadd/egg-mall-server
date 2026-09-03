'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-充值方式管理
 * 管理端充值方式的增删改查
 */
class AdminRechargeWayController extends Controller {
  /**
   * @summary 获取充值方式列表
   * @description 管理端查询充值方式列表，支持按名称搜索和状态筛选
   * @router get /api/admin/recharge-ways
   * @request header string Authorization Bearer admin token
   * @request query string keyword 充值方式名称关键词
   * @request query integer status 状态：0启用 1禁用
   * @request query integer page 页码 默认 1
   * @request query integer pageSize 每页数量 默认 10
   * @response 200 ApiResponse 充值方式列表
   */
  async index() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.rechargeWay.adminList(ctx.query, adminId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 添加充值方式
   * @description 管理端新增一条充值方式
   * @router post /api/admin/recharge-ways
   * @request header string Authorization Bearer admin token
   * @request body RechargeWayCreateRequest *body 充值方式信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.rechargeWay.adminCreate(ctx.request.body, adminId);

    ctx.body = {
      code: 200,
      message: '添加成功',
      data: result,
    };
  }

  /**
   * @summary 修改充值方式
   * @description 管理端更新指定充值方式
   * @router put /api/admin/recharge-ways/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 充值方式ID
   * @request body RechargeWayUpdateRequest *body 充值方式信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.rechargeWay.adminUpdate(id, ctx.request.body, adminId);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: result,
    };
  }

  /**
   * @summary 删除充值方式
   * @description 管理端删除指定充值方式
   * @router delete /api/admin/recharge-ways/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 充值方式ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    await service.rechargeWay.adminDestroy(id);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = AdminRechargeWayController;
