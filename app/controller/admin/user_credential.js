'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-用户凭证管理
 * 管理端用户身份证/凭证管理控制器
 */
class AdminUserCredentialController extends Controller {
  /**
   * @summary 获取用户凭证列表
   * @description 管理端查询用户凭证，支持按凭证UID、用户UID、状态筛选
   * @router get /api/admin/user-credentials
   * @request header string Authorization Bearer admin token
   * @request query integer uid 凭证UID
   * @request query integer user_uid 用户UID
   * @request query integer status 状态：0审核中 1已通过 2审核失败
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 凭证列表
   */
  async index() {
    const { ctx, service } = this;
    const { uid, user_uid, status, page, page_size } = ctx.query;
    const admin = ctx.state.admin;
    // 如果是外部调用或者不同店铺登录，根据上下文取商户 ID
    const merchantId = admin ? admin.id : undefined;
    const operator = { id: admin ? admin.adminId || admin.id : null, role: admin ? admin.role : null, merchantId };

    const result = await service.userCredential.adminList({ uid, user_uid, status, page, page_size }, operator);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 删除用户凭证
   * @description 管理端删除指定用户凭证（物理删除）
   * @router delete /api/admin/user-credentials/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 凭证ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    await service.userCredential.adminDestroy(id);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }

  /**
   * @summary 审核凭证通过
   * @description 根据凭证ID审核通过，status 更新为 1
   * @router post /api/admin/user-credentials/:id/audit-success
   * @request header string Authorization Bearer admin token
   * @request path integer *id 凭证ID
   * @response 200 ApiResponse 审核通过
   */
  async auditSuccess() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const credential = await service.userCredential.auditSuccess(id);

    ctx.body = {
      code: 200,
      message: '审核通过',
      data: credential,
    };
  }

  /**
   * @summary 审核凭证失败
   * @description 根据凭证ID审核失败，status 更新为 2
   * @router post /api/admin/user-credentials/:id/audit-fail
   * @request header string Authorization Bearer admin token
   * @request path integer *id 凭证ID
   * @response 200 ApiResponse 审核失败
   */
  async auditFail() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const credential = await service.userCredential.auditFail(id);

    ctx.body = {
      code: 200,
      message: '审核失败',
      data: credential,
    };
  }
}

module.exports = AdminUserCredentialController;
