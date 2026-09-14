'use strict';

const Controller = require('egg').Controller;

class ShopPayChannelController extends Controller {
  /**
   * @summary 获取充提渠道模板列表
   * @description A端获取充提渠道模板列表 (shop_id = 0)
   * @router get /api/admin-inner/pay-channels
   * @request query integer channel_type 渠道类型：1充值 2提现
   * @request query integer is_enable 状态：0关闭 1启用
   * @request query integer page 页码
   * @request query integer page_size 每页数量
   * @response 200 ApiResponse 渠道列表
   */
  async index() {
    const { ctx, service } = this;
    const params = { ...ctx.query, shop_id: 0 }; // 强制查询模板
    const result = await service.payChannel.list(params);
    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 新增充提渠道模板
   * @description A端新增充提渠道模板，新建店铺时会自动拉取这些模板
   * @router post /api/admin-inner/pay-channels
   * @request body integer *channel_type 渠道类型：1充值 2提现
   * @request body string *channel_code 渠道编码
   * @request body string *channel_name 渠道名称
   * @request body integer is_enable 状态：0关闭 1启用
   * @request body integer sort 排序
   * @request body string remark 备注
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    ctx.validate({
      channel_type: 'int',
      channel_code: 'string',
      channel_name: 'string',
    }, body);

    const exist = await service.payChannel.checkCodeExist(0, body.channel_type, body.channel_code);
    if (exist) {
      ctx.throw(400, '该渠道模板编码已存在');
    }

    const data = await service.payChannel.create({
      ...body,
      shop_id: 0, // A端创建的为模板，shop_id = 0
      is_platform_default: 1, // 模板自身也是1
    });

    ctx.body = {
      code: 200,
      message: '创建成功',
      data,
    };
  }

  /**
   * @summary 修改充提渠道模板
   * @description A端修改充提渠道模板
   * @router put /api/admin-inner/pay-channels/:id
   * @request path integer *id 渠道模板ID
   * @request body string channel_code 渠道编码
   * @request body string channel_name 渠道名称
   * @request body integer is_enable 状态：0关闭 1启用
   * @request body integer sort 排序
   * @request body string remark 备注
   * @response 200 ApiResponse 修改成功
   */
  async update() {
    const { ctx, service } = this;
    const id = ctx.params.id;
    const body = ctx.request.body;

    const channel = await service.payChannel.findById(id);
    // 这里使用 Number(channel.shop_id) 确保类型一致
    if (!channel || Number(channel.shop_id) !== 0) {
      ctx.throw(404, '模板不存在或无权限');
    }

    if (body.channel_code && body.channel_code !== channel.channel_code) {
      const exist = await service.payChannel.checkCodeExist(0, channel.channel_type, body.channel_code, id);
      if (exist) {
        ctx.throw(400, '该模板编码已存在');
      }
    }

    const data = await service.payChannel.update(id, 0, body);
    ctx.body = {
      code: 200,
      message: '修改成功',
      data,
    };
  }

  /**
   * @summary 删除充提渠道模板
   * @description A端删除充提渠道模板
   * @router delete /api/admin-inner/pay-channels/:id
   * @request path integer *id 渠道模板ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const id = ctx.params.id;

    const channel = await service.payChannel.findById(id);
    if (!channel || Number(channel.shop_id) !== 0) {
      ctx.throw(404, '模板不存在或无权限');
    }

    await service.payChannel.destroy(id, 0);
    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }

  /**
   * @summary 同步平台默认渠道到指定店铺
   * @description A端手动给指定店铺绑定/更新平台最新的默认充提渠道模板
   * @router post /api/admin-inner/pay-channels/bind-shop
   * @request body integer *shop_id 需要同步的目标店铺ID
   * @response 200 ApiResponse 同步成功
   */
  async bindShop() {
    const { ctx, service } = this;
    const { shop_id } = ctx.request.body;

    ctx.validate({
      shop_id: 'int',
    }, ctx.request.body);

    await service.payChannel.syncTemplateToShop(shop_id);

    ctx.body = {
      code: 200,
      message: '同步成功',
    };
  }
}

module.exports = ShopPayChannelController;
