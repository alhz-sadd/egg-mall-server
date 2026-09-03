'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-充值请求管理
 * 管理端充值请求列表控制器
 */
class AdminRechargeRequestController extends Controller {
  /**
   * @summary 获取充值请求列表
   * @description 管理端查询移动端发起的充值请求列表
   * @router get /api/admin/recharge-requests
   * @request header string Authorization Bearer admin token
   * @request query integer user_id 用户ID
   * @request query integer status 状态：0充值中 1成功 2失败
   * @request query integer examine_type 审核类型：0用户自己充值 1代付
   * @request query integer pay_way 充值方式
   * @request query integer page 页码 默认 1
   * @request query integer pageSize 每页数量 默认 10
   * @response 200 ApiResponse 充值请求列表
   */
  async index() {
    const { ctx, service } = this;
    const result = await service.rechargeRequest.adminList(ctx.query);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 充值请求审核成功
   * @description 管理端对充值请求进行审核通过，status 更新为 1，并给用户增加余额
   * @router post /api/admin/recharge-requests/audit-success
   * @request header string Authorization Bearer admin token
   * @request body RechargeAuditSuccessRequest *body 审核成功参数
   *   recharge_id: 充值请求ID
   *   recharge_money: 充值金额
   *   recharge_user_arrive_money: 用户到账金额
   *   recharge_platform_arrive_money: 平台到账金额
   *   examine_type: 审核类型 0真实充值 1虚拟充值
   *   remark: 备注
   *   google_code: 谷歌验证码（二级密码）
   * @response 200 ApiResponse 审核成功
   */
  async auditSuccess() {
    const { ctx, service } = this;
    const result = await service.rechargeRequest.auditSuccess(ctx.request.body);

    ctx.body = {
      code: 200,
      message: '审核成功',
      data: result,
    };
  }

  /**
   * @summary 充值请求审核失败
   * @description 管理端对充值请求进行审核失败，status 更新为 2
   * @router post /api/admin/recharge-requests/audit-fail
   * @request header string Authorization Bearer admin token
   * @request body RechargeAuditFailRequest *body 审核失败参数
   *   recharge_id: 充值请求ID
   *   remark: 备注
   *   google_code: 谷歌验证码（二级密码）
   * @response 200 ApiResponse 审核失败
   */
  async auditFail() {
    const { ctx, service } = this;
    const result = await service.rechargeRequest.auditFail(ctx.request.body);

    ctx.body = {
      code: 200,
      message: '审核失败',
      data: result,
    };
  }
}

module.exports = AdminRechargeRequestController;
