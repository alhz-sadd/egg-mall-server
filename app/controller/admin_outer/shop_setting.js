'use strict';

const Controller = require('egg').Controller;

class AdminOuterShopSettingController extends Controller {
  // 店家获取自己的店铺配置
  async show() {
    const { ctx } = this;
    // 从 adminOuter 中获取当前登录店家绑定的 shop_id
    const shopId = ctx.state.adminOuter ? ctx.state.adminOuter.shop_id : null;

    if (!shopId) {
      ctx.throw(403, '未绑定店铺，无法访问配置');
    }

    const setting = await ctx.model.ShopConfig.findOne({
      where: { shop_id: shopId },
    });

    if (!setting) {
      ctx.throw(404, '店铺配置不存在');
    }

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: setting,
    };
  }

  // 店家更新自己的店铺配置
  async update() {
    const { ctx } = this;
    const shopId = ctx.state.adminOuter ? ctx.state.adminOuter.shop_id : null;

    if (!shopId) {
      ctx.throw(403, '未绑定店铺，无法修改配置');
    }

    const payload = ctx.request.body;

    ctx.validate({
      real_name_reward: { type: 'number', required: false },
      order_pay_timeout_switch: { type: 'int', required: false },
      order_pay_timeout: { type: 'int', required: false },
      withdraw_min_amount: { type: 'number', required: false },
      withdraw_fee_type: { type: 'int', required: false },
      withdraw_fee_value: { type: 'number', required: false },
      withdraw_first_need_task: { type: 'int', required: false },
      withdraw_first_need_identity: { type: 'int', required: false },
    }, payload);

    const setting = await ctx.model.ShopConfig.findOne({
      where: { shop_id: shopId },
    });

    if (!setting) {
      ctx.throw(404, '店铺配置不存在');
    }

    await setting.update(payload);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: setting,
    };
  }
}

module.exports = AdminOuterShopSettingController;
