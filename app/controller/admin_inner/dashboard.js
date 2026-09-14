'use strict';

const Controller = require('egg').Controller;

class DashboardController extends Controller {
  async stats() {
    const { ctx, service } = this;
    // A端不传 shopId，统计全平台数据
    const data = await service.dashboard.getStats(null);
    ctx.body = {
      code: 200,
      message: '获取成功',
      data,
    };
  }
}

module.exports = DashboardController;
