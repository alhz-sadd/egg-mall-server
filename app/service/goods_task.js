'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

class GoodsTaskService extends Service {
  /**
   * 分页获取任务商品列表
   * @param query
   */
  async list(query = {}) {
    const { ctx } = this;
    const { goods_name, status, price_min, price_max, page = 1, page_size = 10 } = query;
    const where = { is_deleted: 0 };

    if (goods_name) where.goods_name = { [Op.like]: `%${goods_name}%` };
    if (status !== undefined && status !== '') where.status = status;

    if (price_min !== undefined || price_max !== undefined) {
      const priceCondition = {};
      if (price_min !== undefined && price_min !== '') {
        priceCondition[Op.gte] = Number(price_min);
      }
      if (price_max !== undefined && price_max !== '') {
        priceCondition[Op.lte] = Number(price_max);
      }
      // 如果使用了至少一个条件（Symbol 属性长度 > 0）
      if (Object.getOwnPropertySymbols(priceCondition).length > 0) {
        where.goods_price = priceCondition;
      }
    }

    const offset = (page - 1) * page_size;

    const { count, rows } = await ctx.model.GoodsTask.findAndCountAll({
      where,
      order: [[ 'goods_price', 'ASC' ], [ 'id', 'DESC' ]], // 按价格从低到高排序
      offset,
      limit: Number(page_size),
    });

    return {
      list: rows,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
      },
    };
  }

  /**
   * 获取详情
   * @param id
   */
  async detail(id) {
    const { ctx } = this;
    const item = await ctx.model.GoodsTask.findOne({
      where: { id, is_deleted: 0 },
    });
    ctx.assert(item, 404, '任务商品不存在');
    return item;
  }

  /**
   * 创建任务商品
   * @param payload
   */
  async create(payload) {
    const { ctx } = this;
    return await ctx.model.GoodsTask.create(payload);
  }

  /**
   * 更新任务商品
   * @param id
   * @param payload
   */
  async update(id, payload) {
    const { ctx } = this;
    const item = await ctx.model.GoodsTask.findOne({ where: { id, is_deleted: 0 } });
    ctx.assert(item, 404, '任务商品不存在');

    return await item.update({
      ...payload,
      update_time: ctx.app.Sequelize.literal('CURRENT_TIMESTAMP'),
    });
  }

  /**
   * 物理删除任务商品
   * @param id
   */
  async destroy(id) {
    const { ctx } = this;
    const item = await ctx.model.GoodsTask.findOne({ where: { id, is_deleted: 0 } });
    ctx.assert(item, 404, '任务商品不存在');
    return await item.destroy();
  }
}

module.exports = GoodsTaskService;
