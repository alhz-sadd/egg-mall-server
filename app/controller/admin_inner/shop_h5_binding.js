'use strict';

const Controller = require('egg').Controller;

class ShopH5BindingController extends Controller {
  /**
   * 获取店铺H5绑定列表
   */
  async index() {
    const { ctx } = this;
    const rule = {
      page: { type: 'int', required: false, default: 1, convertType: 'int' },
      page_size: { type: 'int', required: false, default: 10, convertType: 'int' },
      shop_id: { type: 'int', required: false, convertType: 'int' },
      h5_url: { type: 'string', required: false },
      status: { type: 'int', required: false, convertType: 'int' },
    };

    try {
      ctx.validate(rule, ctx.query);
    } catch (err) {
      ctx.logger.warn(err.errors);
      ctx.body = { code: 400, message: '参数校验失败', errors: err.errors };
      return;
    }

    const result = await ctx.service.adminInner.shopH5Binding.getList(ctx.query);
    ctx.body = {
      code: 200,
      message: '获取成功',
      data: result,
    };
  }

  /**
   * 获取单条详情
   */
  async show() {
    const { ctx } = this;
    const { id } = ctx.params;

    const result = await ctx.service.adminInner.shopH5Binding.getDetail(id);
    ctx.body = {
      code: 200,
      message: '获取成功',
      data: result,
    };
  }

  /**
   * 创建绑定
   */
  async create() {
    const { ctx } = this;
    const body = { ...ctx.request.body };

    // 兼容前端传入的 domain 字段
    if (body.domain && !body.h5_url) {
      body.h5_url = body.domain;
    }

    const rule = {
      shop_id: { type: 'int', required: true, convertType: 'int' },
      h5_url: { type: 'string', required: true },
      status: { type: 'int', required: false, convertType: 'int' },
      remark: { type: 'string', required: false },
    };

    try {
      ctx.validate(rule, body);
    } catch (err) {
      ctx.logger.warn(err.errors);
      ctx.body = { code: 400, message: '参数校验失败', errors: err.errors };
      return;
    }

    const result = await ctx.service.adminInner.shopH5Binding.create(body);
    ctx.body = {
      code: 200,
      message: '创建成功',
      data: result,
    };
  }

  /**
   * 更新绑定
   */
  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const body = { ...ctx.request.body };

    // 兼容前端传入的 domain 字段
    if (body.domain && !body.h5_url) {
      body.h5_url = body.domain;
    }

    const rule = {
      shop_id: { type: 'int', required: false, convertType: 'int' },
      h5_url: { type: 'string', required: false },
      status: { type: 'int', required: false, convertType: 'int' },
      remark: { type: 'string', required: false },
    };

    try {
      ctx.validate(rule, body);
    } catch (err) {
      ctx.logger.warn(err.errors);
      ctx.body = { code: 400, message: '参数校验失败', errors: err.errors };
      return;
    }

    const result = await ctx.service.adminInner.shopH5Binding.update(id, body);
    ctx.body = {
      code: 200,
      message: '更新成功',
      data: result,
    };
  }

  /**
   * 删除绑定
   */
  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    await ctx.service.adminInner.shopH5Binding.delete(id);
    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }
}

module.exports = ShopH5BindingController;
