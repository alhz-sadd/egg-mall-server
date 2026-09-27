'use strict';

const Controller = require('egg').Controller;

class GoodsTaskController extends Controller {
  /**
   * 任务商品列表 (B端)
   */
  async index() {
    const { ctx } = this;
    const query = ctx.query;
    const result = await ctx.service.goodsTask.list(query);
    ctx.body = { code: 200, message: 'success', data: result };
  }
}

module.exports = GoodsTaskController;
