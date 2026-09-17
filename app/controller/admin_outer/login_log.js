'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 店铺后台-登录日志管理
 * 内部管理系统登录日志控制器，查询全平台登录日志
 */
class LoginLogController extends Controller {
  /**
   * @summary 获取登录日志列表
   * @description 获取管理员登录日志，支持账号、状态、IP地址、登录时间区间筛选
   * @router get /api/admin-outer/login-logs
   */
  async index() {
    const { ctx, service } = this;
    const adminOuter = ctx.state.adminOuter;

    // 将当前登录用户传入 service，以进行店铺隔离
    const result = await service.sysLog.loginLogs(ctx.query, adminOuter);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 批量删除登录日志
   * @description 根据ID数组批量删除登录日志
   * @router delete /api/admin-outer/login-logs/batch
   */
  async batchDestroy() {
    const { ctx, service } = this;
    // B端店长目前不允许直接删除系统日志，为了安全如果前端有按钮需要实现，必须做好权限隔离
    ctx.throw(403, '暂无权限删除登录日志');
  }

  /**
   * @summary 清空登录日志
   * @description 清空所有管理员登录日志
   * @router delete /api/admin-outer/login-logs/clear
   */
  async clear() {
    const { ctx, service } = this;
    ctx.throw(403, '暂无权限清空登录日志');
  }
}

module.exports = LoginLogController;
