'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-提现参数配置
 * 管理端提现参数配置控制器，全站仅维护一条配置记录
 */
class WithdrawConfigController extends Controller {
  /**
   * @summary 获取提现参数配置
   * @description 获取当前提现参数配置（仅返回启用状态的配置）
   * @router get /api/admin/withdraw-config
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 配置详情
   */
  async get() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;
    const data = await service.withdrawConfig.get(adminId);

    ctx.body = {
      code: 200,
      message: 'success',
      data,
    };
  }

  /**
   * @summary 管理端获取完整提现参数配置
   * @description 获取完整提现参数配置数据（含状态）
   * @router get /api/admin/withdraw-config/detail
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 完整配置详情
   */
  async adminGet() {
    const { ctx, service } = this;
    const data = await service.withdrawConfig.adminGet();

    ctx.body = {
      code: 200,
      message: 'success',
      data,
    };
  }

  /**
   * @summary 修改提现参数配置
   * @description 更新提现参数配置，需要googleCode二级密码验证
   * @router put /api/admin/withdraw-config
   * @request header string Authorization Bearer admin token
   * @request body WithdrawConfigUpdateRequest *body 配置参数
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    // 验证管理员登录状态
    const adminInfo = ctx.state.admin;
    ctx.assert(adminInfo, 401, '未登录');

    // 从数据库查询管理员信息
    const admin = await ctx.model.AdminUser.findByPk(adminInfo.adminId);
    ctx.assert(admin, 401, '管理员不存在');

    // 验证googleCode
    if (admin.google_code) {
      ctx.assert(body.googleCode, 422, 'googleCode不能为空');
      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: admin.google_code,
        encoding: 'base32',
        token: body.googleCode,
        window: 1,
      });

      if (!verified) {
        ctx.throw(422, 'googleCode验证失败');
      }
    }

    const payload = {
      min_money: body.min_money,
      need_task: body.need_task,
      sx_rate: body.sx_rate,
    };

    const adminId = adminInfo.id;
    const data = await service.withdrawConfig.update(payload, adminId);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data,
    };
  }
}

module.exports = WithdrawConfigController;
