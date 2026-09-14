'use strict';

const Controller = require('egg').Controller;

class ShopPayChannelController extends Controller {
  /**
   * @summary 获取充提渠道列表
   * @description C端获取充提渠道列表（充值页面、提现页面获取对应的渠道）
   * @router get /api/mobile/pay-channels
   * @request query integer *channel_type 渠道类型：1充值渠道 2提现渠道
   * @response 200 ApiResponse 渠道列表
   */
  async index() {
    const { ctx, service } = this;
    const { channel_type } = ctx.query;

    if (!channel_type) {
      ctx.throw(400, 'channel_type 是必填项');
    }

    // C端用户的 shop_id 必须通过 customer_relation 获取
    // 先尝试取 userId，如果取不到再取 user_id，以兼容不同版本的 token 载荷
    const user_id = ctx.state.user.userId || ctx.state.user.user_id || ctx.state.user.id;

    if (!user_id) {
      ctx.throw(401, '未获取到有效的用户凭证，请重新登录');
    }

    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: user_id },
    });

    if (!relation || !relation.shop_id) {
      ctx.throw(400, '当前用户未绑定店铺');
    }

    const shop_id = relation.shop_id;

    // C端只查询已启用的，且不分页（全部返回供用户选择）
    const result = await service.shopPayChannel.list({
      shop_id,
      channel_type,
      is_enable: 1,
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: result.rows,
    };
  }
}

module.exports = ShopPayChannelController;
