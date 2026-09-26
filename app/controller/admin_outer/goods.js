'use strict';

const Controller = require('egg').Controller;

class AdminOuterGoodsController extends Controller {
  /**
   * B端获取本店商品列表 (下拉框使用，不分页)
   * GET /api/admin-outer/goods/all
   */
  async all() {
    const { ctx, app } = this;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const { Op } = app.Sequelize;
    const { keyword, goods_type, min_price, max_price } = ctx.query;

    const where = {
      is_deleted: 0,
      status: 1, // 只获取上架的商品
      // 如果您的业务逻辑是所有店铺共享一套商品池，则不需要加 shop_id 过滤。
    };

    if (keyword) {
      where.goods_name = { [Op.like]: '%' + keyword + '%' };
    }

    if (goods_type) {
      where.goods_type = parseInt(goods_type);
    }

    if (min_price || max_price) {
      where.price = {};
      if (min_price) {
        where.price[Op.gte] = Number(min_price);
      }
      if (max_price) {
        where.price[Op.lte] = Number(max_price);
      }
    }

    const list = await ctx.model.Goods.findAll({
      where,
      attributes: ['goods_id', 'goods_name', 'goods_no', 'goods_type', 'price', 'cover_image'],
      order: [['create_time', 'DESC']],
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: list,
    };
  }
}

module.exports = AdminOuterGoodsController;
