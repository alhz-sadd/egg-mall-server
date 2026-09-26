'use strict';

const Controller = require('egg').Controller;

class GoodsTaskController extends Controller {
  /**
   * 任务商品列表
   */
  async index() {
    const { ctx } = this;
    const query = ctx.query;
    const result = await ctx.service.goodsTask.list(query);
    ctx.body = { code: 200, message: 'success', data: result };
  }

  /**
   * 任务商品详情
   */
  async show() {
    const { ctx } = this;
    const { id } = ctx.params;
    const result = await ctx.service.goodsTask.detail(id);
    ctx.body = { code: 200, message: 'success', data: result };
  }

  /**
   * 创建任务商品
   */
  async create() {
    const { ctx } = this;
    const payload = ctx.request.body;
    ctx.validate({
      goods_name: { type: 'string', required: true, desc: '商品名称' },
      goods_price: { type: 'number', required: true, desc: '价格' },
      status: { type: 'int', required: false, desc: '状态' },
      goods_images: { type: 'array', required: false, desc: '商品图片数组' },
    }, payload);

    const result = await ctx.service.goodsTask.create(payload);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: result,
    };
  }

  /**
   * 更新任务商品
   */
  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const payload = ctx.request.body;
    ctx.validate({
      goods_name: { type: 'string', required: false, desc: '商品名称' },
      goods_price: { type: 'number', required: false, desc: '价格' },
      status: { type: 'int', required: false, desc: '状态' },
      goods_images: { type: 'array', required: false, desc: '商品图片数组' },
    }, payload);

    await ctx.service.goodsTask.update(id, payload);
    ctx.body = { code: 200, message: '更新成功' };
  }

  /**
   * 删除任务商品
   */
  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;
    await ctx.service.goodsTask.destroy(id);
    ctx.body = { code: 200, message: '删除成功' };
  }
}

module.exports = GoodsTaskController;
