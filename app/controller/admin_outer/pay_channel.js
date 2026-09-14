'use strict';

const Controller = require('egg').Controller;

class AdminOuterPayChannelController extends Controller {

  async index() {
    const { ctx } = this;
    const { channel_type, page, page_size, is_enable } = ctx.query;

    // 获取当前登录店长所属店�?ID
    const shop_id = ctx.state.adminOuter ? ctx.state.adminOuter.shop_id : null;
    if (!shop_id) {
      ctx.throw(403, '未绑定店铺，无法操作');
    }

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
    const shop_id = ctx.state.adminOuter ? ctx.state.adminOuter.shop_id : null;
    if (!shop_id) {
      ctx.throw(403, '未绑定店铺，无法操作');
    }
    const { channel_type, channel_code, channel_name, is_enable, sort, remark } = ctx.request.body;

    ctx.validate({
      channel_type: { type: 'number', required: true },
      channel_code: { type: 'string', required: true },
      channel_name: { type: 'string', required: true },
    });

    await ctx.service.payChannel.create({
      shop_id, // B端创建的是专属店铺渠?
      channel_type,
      channel_code,
      channel_name,
      is_platform_default: 0, // 店长自己建的，标记为0
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
    const shop_id = ctx.state.adminOuter ? ctx.state.adminOuter.shop_id : null;
    if (!shop_id) {
      ctx.throw(403, '未绑定店铺，无法操作');
    }
    const payload = ctx.request.body;

    // 底层 service 已处�?is_platform_default 的字段过滤逻辑
    await ctx.service.payChannel.update(id, shop_id, payload);

    ctx.body = {
      code: 200,
      message: '修改成功',
      data: null,
    };
  }

  async destroy() {
    const { ctx } = this;
    const id = ctx.params.id;
    const shop_id = ctx.state.adminOuter ? ctx.state.adminOuter.shop_id : null;
    if (!shop_id) {
      ctx.throw(403, '未绑定店铺，无法操作');
    }

    // 底层 service 已处�?is_platform_default 的删除拦截逻辑
    await ctx.service.payChannel.destroy(id, shop_id);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = AdminOuterPayChannelController;
