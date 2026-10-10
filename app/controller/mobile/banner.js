'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-轮播图
 * 移动端轮播图控制器
 */
class BannerController extends Controller {
  /**
   * @summary 获取轮播图列表
   * @description 移动端首页轮播图，仅返回状态为启用的轮播图
   * @router get /api/mobile/public/banners
   * @response 200 ApiResponse 轮播图列表
   */
  async index() {
    const { ctx, service } = this;

    // 首先尝试从 header 或 query 中获取 origin/host 判断绑定的 H5 域名
    // 本地开发调试时，允许前端直接在 header 里传入 shop-id
    let host = ctx.request.header.origin || ctx.request.header.host || '';
    // 去除协议头，保留域名（或包含端口号的完整主机名），以便于使用 like 进行模糊匹配
    host = host.replace(/^https?:\/\//, '');

    // 如果带有端口号，去掉端口号进行匹配
    const hostWithoutPort = host.split(':')[0];

    let shopId = ctx.request.header['shop-id'] ? parseInt(ctx.request.header['shop-id'], 10) : 0;

    if (!shopId && host) {
      // 在数据库中查找该域名绑定的店铺
      const binding = await ctx.model.ShopH5Binding.findOne({
        where: {
          [ctx.app.Sequelize.Op.or]: [
            { h5_url: { [ctx.app.Sequelize.Op.like]: `%${host}%` } },
            { h5_url: { [ctx.app.Sequelize.Op.like]: `%${hostWithoutPort}%` } },
          ],
          status: 1,
          is_deleted: 0,
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

    const result = await service.banner.list(shopId);
    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }
}

module.exports = BannerController;
