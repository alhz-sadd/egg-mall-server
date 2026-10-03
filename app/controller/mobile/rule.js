'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-规则
 * 移动端规则控制器
 */
class RuleController extends Controller {
  /**
   * @summary 获取规则图片列表
   * @description 获取启用状态的规则图片数组
   * @router get /api/mobile/public/rules
   * @response 200 ApiResponse 规则图片数组
   */
  async index() {
    const { ctx, service } = this;
    
    // 首先尝试从 header 或 query 中获取 origin/host 判断绑定的 H5 域名
    // 本地开发调试时，允许前端直接在 header 里传入 shop-id
    const host = ctx.request.header.origin || ctx.request.header.host;
    let shopId = ctx.request.header['shop-id'] ? parseInt(ctx.request.header['shop-id'], 10) : 0;
    
    if (!shopId && host) {
      // 在数据库中查找该域名绑定的店铺
      const binding = await ctx.model.ShopH5Binding.findOne({
        where: { h5_url: { [ctx.app.Sequelize.Op.like]: `%${host}%` }, status: 1, is_deleted: 0 },
      });
      if (binding) {
        shopId = binding.shop_id;
      }
    }
    
    // 如果没有通过域名找到，退而求其次尝试使用用户 token 里的 shop_id
    if (!shopId) {
      shopId = ctx.state.shop_id || 0;
    }

    // 将解析出的 shopId 传入获取规则的方法
    const data = await service.rule.get(shopId);

    ctx.body = {
      code: 200,
      message: 'success',
      data,
    };
  }
}

module.exports = RuleController;
