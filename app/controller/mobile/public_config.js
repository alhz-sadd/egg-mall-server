'use strict';

const Controller = require('egg').Controller;

class PublicConfigController extends Controller {
  /**
   * 格式化公共配置列表，确保图片字段兼容
   * @param list
   * @param configType
   */
  _formatList(list, configType) {
    if (!list || !Array.isArray(list)) return list;
    return list.map(item => {
      const data = item.toJSON ? item.toJSON() : item;
      const rawImg = data.cover_image || data.coverImage || '';

      // 商品类自动回填图片
      if ([ 4, 5 ].includes(Number(configType)) && !rawImg && data.goods) {
        data.cover_image = data.goods.cover_image;
      }

      const img = data.cover_image || '';
      data.image = img;
      data.imageUrl = img;

      // Banner 提取 linkUrl
      if (Number(configType) === 1 && data.extra) {
        let extra = data.extra;
        if (typeof extra === 'string') {
          try { extra = JSON.parse(extra); } catch (e) { extra = {}; }
        }
        data.linkUrl = extra.linkUrl || '';
      }

      return data;
    });
  }

  /**
   * 获取 Banner 列表
   */
  async banners() {
    const { ctx } = this;
    const list = await ctx.service.h5Config.getPublicList(1);
    ctx.body = { code: 200, data: this._formatList(list, 1) };
  }

  /**
   * 获取公告列表
   */
  async notices() {
    const { ctx } = this;
    const list = await ctx.service.h5Config.getPublicList(2);
    ctx.body = { code: 200, data: this._formatList(list, 2) };
  }

  /**
   * 获取规则/协议列表
   */
  async rules() {
    const { ctx } = this;
    const list = await ctx.service.h5Config.getPublicList(3);

    // 只返回图片数组
    const images = list.map(item => item.cover_image).filter(img => img);

    ctx.body = { code: 200, data: images };
  }

  /**
   * 获取商品列表 (唯一保留的公开商品接口)
   * 支持分页、分类过滤、价格排序
   */
  async homeProducts() {
    const { ctx } = this;
    const { page = 1, pageSize = 10, category_id, order_by, goods_type } = ctx.query;

    const where = { status: 1 };

    // 分类过滤 - 移除掉对 goods 表不存在的 category_id 查询
    // 如果之后需要支持分类，请关联对应的分类表或者新增该字段
    // if (category_id) {
    //   where.category_id = category_id;
    // }

    // 商品类型过滤 (1普通商品 2任务商品)
    if (goods_type) {
      where.goods_type = goods_type;
    }

    // 排序逻辑
    let orderClause = [[ 'goods_id', 'DESC' ]]; // 默认按ID倒序
    if (order_by === 'price_asc') {
      orderClause = [[ 'price', 'ASC' ]];
    } else if (order_by === 'price_desc') {
      orderClause = [[ 'price', 'DESC' ]];
    }

    const limit = parseInt(pageSize, 10) || 10;
    const offset = (parseInt(page, 10) - 1) * limit;

    const { count, rows } = await ctx.model.ShopGoods.findAndCountAll({
      where,
      attributes: [ 'goods_id', 'goods_name', 'cover_image', 'price', 'goods_type' ],
      order: orderClause,
      limit,
      offset,
    });

    // 兼容前端字段
    const formatted = rows.map(item => {
      const data = item.toJSON();
      data.image = data.cover_image;
      data.imageUrl = data.cover_image;
      return data;
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        list: formatted,
        total: count,
        page: parseInt(page, 10),
        page_size: limit,
      },
    };
  }

  /**
   * 获取客服列表
   */
  async customerServices() {
    const { ctx } = this;
    const list = await ctx.service.h5Service.getPublicList();
    if (list) {
      const formatted = list.map(item => {
        const data = item.toJSON ? item.toJSON() : item;
        data.image = data.avatar || '';
        data.imageUrl = data.avatar || '';
        return data;
      });
      ctx.body = { code: 200, data: formatted };
      return;
    }
    ctx.body = { code: 200, data: list };
  }

  /**
   * 通用配置查询接口
   */
  async getConfigByType() {
    const { ctx } = this;
    const { type } = ctx.query;
    ctx.assert(type, 422, 'type 不能为空');
    const list = await ctx.service.h5Config.getPublicList(Number(type));
    ctx.body = { code: 200, data: this._formatList(list, type) };
  }
}

module.exports = PublicConfigController;
