'use strict';

const Controller = require('egg').Controller;

class VipLevelController extends Controller {
  /**
   * 获取平台VIP模板列表
   */
  async index() {
    const { ctx, service } = this;
    const list = await service.vipLevel.list({ shop_id: 0 });
    ctx.body = {
      code: 200,
      message: 'success',
      data: list,
    };
  }

  /**
   * 新增平台VIP模板
   */
  async create() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    ctx.validate({
      level: 'int',
      level_name: 'string',
    }, body);

    const data = await service.vipLevel.create({
      ...body,
      shop_id: 0,
    });

    ctx.body = {
      code: 200,
      message: '创建成功',
      data,
    };
  }

  /**
   * 修改平台VIP模板
   */
  async update() {
    const { ctx, service } = this;
    const id = ctx.params.id;
    const body = ctx.request.body;

    const data = await service.vipLevel.update(id, 0, body);
    ctx.body = {
      code: 200,
      message: '修改成功',
      data,
    };
  }

  /**
   * 删除平台VIP模板
   */
  async destroy() {
    const { ctx, service } = this;
    const id = ctx.params.id;

    await service.vipLevel.destroy(id, 0);
    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }

  /**
   * 同步平台模板到指定店铺
   */
  async bindShop() {
    const { ctx, service } = this;
    const { shop_id } = ctx.request.body;

    ctx.validate({
      shop_id: 'int',
    }, ctx.request.body);

    await service.vipLevel.syncTemplateToShop(shop_id);

    ctx.body = {
      code: 200,
      message: '同步成功',
    };
  }
}

module.exports = VipLevelController;
