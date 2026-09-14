'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 总后台-登录日志管理
 * 内部管理系统登录日志控制器，查询全平台登录日志
 */
class LoginLogController extends Controller {
  /**
   * @summary 获取登录日志列表
   * @description 获取管理员登录日志，支持账号、状态、IP地址、登录时间区间筛选
   * @router get /api/admin-inner/login-logs
   */
  async index() {
    const { ctx, service } = this;
    const result = await service.sysLog.loginLogs(ctx.query);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 批量删除登录日志
   * @description 根据ID数组批量删除登录日志
   * @router delete /api/admin-inner/login-logs/batch
   */
  async batchDestroy() {
    const { ctx, service } = this;
    await service.sysLog.batchDestroyLoginLogs(ctx.request.body.ids);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }

  /**
   * @summary 清空登录日志
   * @description 清空所有管理员登录日志
   * @router delete /api/admin-inner/login-logs/clear
   */
  async clear() {
    const { ctx, service } = this;
    await service.sysLog.clearLoginLogs();

    ctx.body = {
      code: 200,
      message: '清空成功',
      data: null,
    };
  }
}

module.exports = LoginLogController;
