'use strict';

const Controller = require('egg').Controller;

class MobilePayChannelController extends Controller {

  async list() {
    const { ctx } = this;
    const { channel_type } = ctx.query;
    const user_id = ctx.state.user ? (ctx.state.user.id || ctx.state.user.user_id) : null;

    if (!user_id) {
      ctx.throw(401, '用户未登录');
    }

    ctx.validate({
      channel_type: { type: 'number', required: true },
    });

    // 根据用户ID获取所属店铺ID
    const customerRelation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: user_id },
      attributes: [ 'shop_id' ],
    });

    if (!customerRelation || !customerRelation.shop_id) {
      ctx.throw(400, '当前用户未绑定店铺');
    }

    const result = await ctx.service.payChannel.list({
      shop_id: customerRelation.shop_id,
      channel_type,
      is_enable: 1, // C端只获取已启用的渠道
      // C端不需要分页，直接返回所有可用渠道
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: result.list, // C端直接返回列表数据，不包含total
    };
  }
}

module.exports = MobilePayChannelController;
