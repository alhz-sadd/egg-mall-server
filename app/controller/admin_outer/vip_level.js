'use strict';

const Controller = require('egg').Controller;

class VipLevelController extends Controller {
  /**
   * 获取本店铺VIP模板列表
   */
  async index() {
    const { ctx, service } = this;
    const shop_id = ctx.state.adminOuter.shop_id;
    const list = await service.vipLevel.list({ shop_id });
    ctx.body = {
      code: 200,
      message: 'success',
      data: list,
    };
  }

  /**
   * 新增本店铺VIP模板
   */
  async create() {
    const { ctx, service } = this;
    const shop_id = ctx.state.adminOuter.shop_id;
    const body = ctx.request.body;

    ctx.validate({
      level: 'int',
      level_name: 'string',
    }, body);

    const data = await service.vipLevel.create({
      ...body,
      shop_id,
    });

    ctx.body = {
      code: 200,
      message: '创建成功',
      data,
    };
  }

  /**
   * 修改本店铺VIP模板
   */
  async update() {
    const { ctx, service } = this;
    const shop_id = ctx.state.adminOuter.shop_id;
    const id = ctx.params.id;
    const body = ctx.request.body;

    const data = await service.vipLevel.update(id, shop_id, body);
    ctx.body = {
      code: 200,
      message: '修改成功',
      data,
    };
  }

  /**
   * 删除本店铺VIP模板
   */
  async destroy() {
    const { ctx, service } = this;
    const shop_id = ctx.state.adminOuter.shop_id;
    const id = ctx.params.id;

    await service.vipLevel.destroy(id, shop_id);
    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }

  /**
   * 修改指定用户的VIP等级
   */
  async updateUserVip() {
    const { ctx, service } = this;
    const shop_id = ctx.state.adminOuter.shop_id;
    const { user_id, vip_level } = ctx.request.body;

    ctx.validate({
      user_id: 'int',
      vip_level: 'int',
    }, ctx.request.body);

    await service.vipLevel.updateUserVip(shop_id, user_id, vip_level);

    ctx.body = {
      code: 200,
      message: '修改成功',
    };
  }
}

module.exports = VipLevelController;
