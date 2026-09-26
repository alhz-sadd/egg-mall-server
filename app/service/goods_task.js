'use strict';

const Service = require('egg').Service;

class GoodsTaskService extends Service {
  /**
   * 分页获取任务商品列表
   * @param query
   */
  async list(query = {}) {
    const { ctx } = this;
    const { goods_name, status, page = 1, page_size = 10 } = query;
    const where = { is_deleted: 0 };

    if (goods_name) where.goods_name = { [ctx.app.Sequelize.Op.like]: `%${goods_name}%` };
    if (status !== undefined && status !== '') where.status = status;

    const offset = (page - 1) * page_size;

    const { count, rows } = await ctx.model.GoodsTask.findAndCountAll({
      where,
      order: [[ 'id', 'DESC' ]],
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
   * 软删除任务商品
   * @param id
   */
  async destroy(id) {
    const { ctx } = this;
    const item = await ctx.model.GoodsTask.findOne({ where: { id, is_deleted: 0 } });
    ctx.assert(item, 404, '任务商品不存在');
    return await item.update({ is_deleted: 1 });
  }
}

module.exports = GoodsTaskService;
