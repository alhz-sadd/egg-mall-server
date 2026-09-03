'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-首页统计
 * 管理端首页统计控制器
 */
class AdminDashboardController extends Controller {
  /**
   * @summary 获取首页统计数据
   * @description 获取管理端首页统计面板数据（仅管理员）
   * @router get /api/admin/dashboard/stats
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 统计数据
   */
  async stats() {
    const { ctx, service } = this;

    const data = await service.adminDashboard.stats();

    ctx.body = {
      code: 200,
      message: 'success',
      data,
    };
  }
}

module.exports = AdminDashboardController;
