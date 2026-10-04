'use strict';

const Controller = require('egg').Controller;

class ShopH5BindingController extends Controller {
  /**
   * 获取店铺绑定域名列表 (按类型合并为字符串)
   */
  async index() {
    const { ctx } = this;
    const rule = {
      shop_id: { type: 'int', required: true, convertType: 'int' },
    };

    try {
      ctx.validate(rule, ctx.query);
    } catch (err) {
      ctx.logger.warn(err.errors);
      ctx.body = { code: 400, message: '参数校验失败', errors: err.errors };
      return;
    }

    const result = await ctx.service.adminInner.shopH5Binding.getShopBindings(ctx.query.shop_id);
    ctx.body = {
      code: 200,
      message: '获取成功',
      data: result,
    };
  }

  /**
   * 保存店铺绑定域名
   */
  async create() {
    const { ctx } = this;
    const body = { ...ctx.request.body };

    const rule = {
      shop_id: { type: 'int', required: true, convertType: 'int' },
      h5_domains: { type: 'string', required: false, allowEmpty: true },
      admin_domains: { type: 'string', required: false, allowEmpty: true },
    };

    try {
      ctx.validate(rule, body);
    } catch (err) {
      ctx.logger.warn(err.errors);
      ctx.body = { code: 400, message: '参数校验失败', errors: err.errors };
      return;
    }

    await ctx.service.adminInner.shopH5Binding.saveShopBindings(body);
    ctx.body = {
      code: 200,
      message: '保存成功',
    };
  }
}

module.exports = ShopH5BindingController;
