'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-提现管理
 * 管理端提现请求控制器
 */
class AdminWithdrawController extends Controller {
  /**
   * @summary 获取提现列表
   * @description 管理端查询移动端发起的提现请求列表，支持多条件搜索
   * @router get /api/admin/withdraws
   * @request header string Authorization Bearer admin token
   * @request query integer user_id 用户ID
   * @request query integer admin_id 业务员ID
   * @request query string order_num 订单号（支持模糊搜索）
   * @request query integer status 状态：0提现中 1提现成功 2提现失败
   * @request query integer way 提现方式
   * @request query integer examine_status 审核类型：0用户提现 1代付
   * @request query string start_time 开始时间（格式：2026-08-01 00:00:00）
   * @request query string end_time 结束时间（格式：2026-08-01 23:59:59）
   * @request query integer page 页码 默认 1
   * @request query integer pageSize 每页数量 默认 10
   * @response 200 ApiResponse 提现列表
   */
  async index() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.withdraw.adminList(ctx.query, adminId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 提现审核成功
   * @description 管理端对提现请求进行审核通过，status 更新为 1
   * @router post /api/admin/withdraws/audit-success
   * @request header string Authorization Bearer admin token
   * @request body WithdrawAuditSuccessRequest *body 审核成功参数
   * @response 200 ApiResponse 审核成功
   */
  async auditSuccess() {
    const { ctx, service } = this;
    const result = await service.withdraw.auditSuccess(ctx.request.body);

    ctx.body = {
      code: 200,
      message: '审核成功',
      data: result,
    };
  }

  /**
   * @summary 提现审核失败
   * @description 管理端对提现请求进行审核失败，status 更新为 2，并退回用户余额
   * @router post /api/admin/withdraws/audit-fail
   * @request header string Authorization Bearer admin token
   * @request body WithdrawAuditFailRequest *body 审核失败参数
   * @response 200 ApiResponse 审核失败
   */
  async auditFail() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.withdraw.auditFail(ctx.request.body, adminId);

    ctx.body = {
      code: 200,
      message: '审核失败',
      data: result,
    };
  }
}

module.exports = AdminWithdrawController;
