'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-客服
 * 移动端客服控制器
 */
class CustomerServiceController extends Controller {
  /**
   * @summary 获取客服列表
   * @description 移动端客服列表，仅返回启用状态（status=1），支持关键词搜索
   * @router get /api/mobile/public/customer-services
   * @request query string keyword 关键词（按名称模糊搜索）
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 客服列表
   */
  async index() {
    const { ctx, service } = this;
    
    // 首先尝试从 header 或 query 中获取 origin/host 判断绑定的 H5 域名
    // 首先尝试从 header 或 query 中获取 origin/host 判断绑定的 H5 域名
    let host = ctx.request.header.origin || ctx.request.header.host || '';
    host = host.replace(/^https?:\/\//, '');
    const hostWithoutPort = host.split(':')[0];
    let shopId = ctx.request.header['shop-id'] ? parseInt(ctx.request.header['shop-id'], 10) : 0;
    
    if (!shopId && host) {
      const binding = await ctx.model.ShopH5Binding.findOne({
        where: { 
          [ctx.app.Sequelize.Op.or]: [
            { h5_url: { [ctx.app.Sequelize.Op.like]: `%${host}%` } },
            { h5_url: { [ctx.app.Sequelize.Op.like]: `%${hostWithoutPort}%` } }
          ],
          status: 1, 
          is_deleted: 0 
        },
      });
      if (binding) {
        shopId = binding.shop_id;
      }
    }
    
    // 如果没有通过域名找到，退而求其次尝试使用用户 token 里的 shop_id
    if (!shopId) {
      shopId = ctx.state.shop_id || 0;
    }

    const query = { ...ctx.query, shop_id: shopId };
    const list = await service.customerService.list(query);

    ctx.body = {
      code: 200,
      message: 'success',
      data: list,
    };
  }
}

module.exports = CustomerServiceController;
