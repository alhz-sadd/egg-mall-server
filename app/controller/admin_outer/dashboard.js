'use strict';

const Controller = require('egg').Controller;

class DashboardController extends Controller {
  async stats() {
    const { ctx, service } = this;
    const shopId = ctx.state.adminOuter.shop_id; // 从 JWT token 解析出的当前登录用户店铺 ID

    if (!shopId) {
      ctx.throw(403, '无权访问：非商家账号或未绑定店铺');
    }

    // B端传 shopId，仅统计该店铺的数据
    const data = await service.dashboard.getStats(shopId);
    ctx.body = {
      code: 200,
      message: '获取成功',
      data,
    };
  }
}

module.exports = DashboardController;
