'use strict';

const Controller = require('egg').Controller;

class GoodsController extends Controller {
  /**
   * 商品列表
   */
  async index() {
    const { ctx } = this;
    const query = ctx.query;
    const result = await ctx.service.goods.list(query);
    ctx.body = { code: 200, message: 'success', data: result };
  }

  /**
   * 商品详情
   */
  async show() {
    const { ctx } = this;
    const { id } = ctx.params;
    const result = await ctx.service.goods.detail(id);
    ctx.body = { code: 200, message: 'success', data: result };
  }

  /**
   * 创建商品
   */
  async create() {
    const { ctx } = this;
    const payload = ctx.request.body;
    ctx.validate({
      goods_name: { type: 'string', required: true, desc: '商品名称' },
      category_id: { type: 'int', required: true, desc: '商品分类ID' },
      price: { type: 'number', required: true, desc: '价格' },
      is_home: { type: 'int', required: false, desc: '是否首页' },
    }, payload);

    const adminId = ctx.state.adminInner.adminInnerId;

    // 1. 创建商品
    const result = await ctx.service.goods.create(payload, adminId);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: result,
    };
  }

  /**
   * 更新商品
   */
  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const payload = ctx.request.body;
    ctx.validate({
      goods_name: { type: 'string', required: true, desc: '商品名称' },
      category_id: { type: 'int', required: true, desc: '商品分类ID' },
      is_home: { type: 'int', required: false, desc: '是否首页' },
    }, payload);

    const adminId = ctx.state.adminInner.adminInnerId;
    await ctx.service.goods.update(id, payload, adminId);
    ctx.body = { code: 200, message: '更新成功' };
  }

  /**
   * 删除商品
   */
  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;
    await ctx.service.goods.destroy(id);
    ctx.body = { code: 200, message: '删除成功' };
  }
}

module.exports = GoodsController;
