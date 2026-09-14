'use strict';

const Controller = require('egg').Controller;

class ShopController extends Controller {
  // 获取当前登录用户归属店铺的详情
  async show() {
    const { ctx } = this;
    const shopId = ctx.state.adminOuter ? ctx.state.adminOuter.shop_id : null;

    if (!shopId) {
      ctx.throw(400, '当前账号未绑定店铺');
    }

    // 传递操作人信息，用于在 service 中进行数据隔离判断(比如 店长看所有，业务员只能看自己发展的)
    const operator = ctx.state.adminOuter || {};

    const shop = await ctx.service.shop.detail(shopId, { operator });
    if (!shop) {
      ctx.throw(404, '店铺不存在');
    }

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: shop,
    };
  }
}

module.exports = ShopController;
