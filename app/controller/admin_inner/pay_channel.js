'use strict';

const Controller = require('egg').Controller;

class AdminInnerPayChannelController extends Controller {

  async index() {
    const { ctx } = this;
    const { channel_type, page, page_size, is_enable } = ctx.query;

    // A端获取的是平台级别的渠道模板，shop_id = 0
    const shop_id = 0;

    const result = await ctx.service.payChannel.list({
      shop_id,
      channel_type,
      page,
      page_size,
      is_enable,
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  async create() {
    const { ctx } = this;
    const { channel_type, channel_code, channel_name, is_enable, sort, remark } = ctx.request.body;

    ctx.validate({
      channel_type: { type: 'number', required: true },
      channel_code: { type: 'string', required: true },
      channel_name: { type: 'string', required: true },
    });

    await ctx.service.payChannel.create({
      shop_id: 0, // A端创建的是平台级别的渠道模板
      channel_type,
      channel_code,
      channel_name,
      is_platform_default: 1, // 平台创建的，标记为1
      is_enable: is_enable !== undefined ? is_enable : 1,
      sort: sort !== undefined ? sort : 0,
      remark: remark || '',
    });

    ctx.body = {
      code: 200,
      message: '新增成功',
      data: null,
    };
  }

  async update() {
    const { ctx } = this;
    const id = ctx.params.id;
    const payload = ctx.request.body;

    // A端修改的是平台级别的渠道模板，shop_id = 0
    await ctx.service.payChannel.update(id, 0, payload);

    ctx.body = {
      code: 200,
      message: '修改成功',
      data: null,
    };
  }

  async destroy() {
    const { ctx } = this;
    const id = ctx.params.id;

    // A端删除的是平台级别的渠道模板，shop_id = 0
    await ctx.service.payChannel.destroy(id, 0);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }

  async bindShop() {
    const { ctx } = this;
    const { shop_id } = ctx.request.body;

    ctx.validate({
      shop_id: { type: 'number', required: true },
    });

    await ctx.service.payChannel.syncTemplateToShop(shop_id);

    ctx.body = {
      code: 200,
      message: '同步成功',
      data: null,
    };
  }
}

module.exports = AdminInnerPayChannelController;
