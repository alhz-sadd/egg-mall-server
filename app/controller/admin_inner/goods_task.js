'use strict';

const Controller = require('egg').Controller;

class GoodsTaskController extends Controller {
  /**
   * 任务商品列表
   */
  async index() {
    const { ctx, service } = this;
    const query = ctx.query;
    const result = await service.goodsTask.list(query);
    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * 任务商品详情
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const result = await service.goodsTask.detail(id);
    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * 创建任务商品
   */
  async create() {
    const { ctx, service } = this;
    const payload = ctx.request.body;
    const result = await service.goodsTask.create(payload);
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
    const { ctx, service } = this;
    const { id } = ctx.params;
    const payload = ctx.request.body;
    const result = await service.goodsTask.update(id, payload);
    ctx.body = {
      code: 200,
      message: '更新成功',
      data: result,
    };
  }

  /**
   * 删除任务商品
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    await service.goodsTask.destroy(id);
    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }
}

module.exports = GoodsTaskController;
