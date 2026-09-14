'use strict';

const Controller = require('egg').Controller;

class VipLevelController extends Controller {
  /**
   * 获取所属店铺的 VIP 等级列表
   */
  async index() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;

    // 获取用户信息以获取 shop_id
    const user = await ctx.model.SysUser.findByPk(userId);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    if (!user.shop_id) {
      ctx.body = {
        code: 200,
        message: 'success',
        data: [],
      };
      return;
    }

    // 获取该店铺所有启用的 VIP 等级
    const list = await service.vipLevel.list({
      shop_id: user.shop_id,
      is_enable: 1,
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: list,
    };
  }
}

module.exports = VipLevelController;
