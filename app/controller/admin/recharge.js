'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-上分明细管理
 * 管理端上分明细控制器（平台给用户的上分记录，如佣金、红包等）
 */
class AdminRechargeController extends Controller {
  /**
   * @summary 获取上分明细列表
   * @description 管理端查询上分明细，支持按UID、业务员UID、用户UID、操作类型、时间筛选。与移动端充值请求管理不同，此处为平台给用户的上分记录（佣金、红包等）。
   * @router get /api/admin/recharges
   * @request header string Authorization Bearer admin token
   * @request query integer uid 记录UID
   * @request query integer operator_uid 业务员UID
   * @request query integer user_uid 用户UID
   * @request query integer type 操作类型：0赠送客户 1员工添加 2第三方充值
   * @request query integer operation_type 操作类型（同 type，兼容字段）：0赠送客户 1员工添加 2第三方充值
   * @request query string start_time 开始时间
   * @request query string end_time 结束时间
   * @request query integer page 页码 默认 1
   * @request query integer pageSize 每页数量 默认 10
   * @response 200 ApiResponse 上分明细列表
   */
  async index() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.recharge.adminList(ctx.query, adminId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 创建上分明细
   * @description 管理端新增上分明细，操作类型：0赠送客户 1员工添加 2第三方充值
   * @router post /api/admin/recharges
   * @request header string Authorization Bearer admin token
   * @request body AdminRechargeRequest *body 上分明细信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const operatorId = ctx.state.admin.adminId;

    const result = await service.recharge.adminCreate(ctx.request.body, operatorId);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: result,
    };
  }

  /**
   * @summary 更新上分明细
   * @description 管理端更新上分明细，操作类型：0赠送客户 1员工添加 2第三方充值
   * @router put /api/admin/recharges/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 记录ID
   * @request body AdminRechargeRequest *body 上分明细信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.recharge.adminUpdate(id, ctx.request.body, adminId);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: result,
    };
  }

  /**
   * @summary 删除上分明细
   * @description 管理端删除指定上分明细（物理删除）
   * @router delete /api/admin/recharges/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 记录ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    await service.recharge.adminDestroy(id, adminId);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = AdminRechargeController;
