'use strict';

const Controller = require('egg').Controller;

class H5ServiceController extends Controller {
  /**
   * 客夫列表
   */
  async list() {
    const { ctx } = this;
    const query = { ...ctx.query };

    // 如果路由带有 shop_id，则覆盖；如果没有带，则强制设为0，只返回平台模板
    if (ctx.params.shop_id !== undefined) {
      query.shop_id = ctx.params.shop_id;
    } else {
      query.shop_id = 0;
    }

    const result = await ctx.service.h5Service.list(query);

    // 兼容前端字段名 (将 avatar 映射为 image 和 imageUrl)
    if (result.list) {
      result.list = result.list.map(item => {
        const data = item.toJSON ? item.toJSON() : item;
        if (data.avatar) {
          data.image = data.avatar;
          data.imageUrl = data.avatar;
        }
        return data;
      });
    }

    ctx.body = { code: 200, message: 'success', data: result };
  }

  /**
   * 新增客服
   */
  async add() {
    const { ctx, service } = this;
    const body = { ...ctx.request.body };
    if (ctx.params.shop_id !== undefined) {
      body.shop_id = ctx.params.shop_id;
    }

    // 处理文件上传
    const files = ctx.request.files;
    if (files && files.length) {
      const uploadRes = await service.upload.image(files[0], 'services');
      body.avatar = uploadRes.url;
    }

    // 兼容前端传入的字段名
    if (body.name && !body.service_name) body.service_name = body.name;
    if (body.contact && !body.contact_value) body.contact_value = body.contact;
    if (body.link && !body.jump_url) body.jump_url = body.link;
    if (body.image && !body.avatar) body.avatar = body.image;
    if (body.imageUrl && !body.avatar) body.avatar = body.imageUrl;

    // 必填字段校验与默认值
    ctx.assert(body.service_name, 422, '客服名称不能为空');
    // ctx.assert(body.contact_value, 422, '联系方式内容不能为空'); // 根据用户要求，不再强制要求联系类型
    if (body.contact_type === undefined || body.contact_type === null) {
      body.contact_type = 1; // 默认微信
    }

    if (body.shop_id === undefined) {
      body.shop_id = 0; // 默认全局
    }

    // 如果是 Telegram 或 WhatsApp 类型，且前端没有传入 jump_url，但传了 contact_value (比如 tg号)
    // 我们可以自动拼接 jump_url (交由 service 层处理)
    const adminId = ctx.state.adminInner.adminInnerId;
    const result = await ctx.service.h5Service.create(body, adminId);
    ctx.body = { code: 200, message: '新增成功', data: result };
  }

  /**
   * 编辑客服
   */
  async edit() {
    const { ctx, service } = this;
    const body = { ...ctx.request.body };
    const id = ctx.params.id || body.id;
    ctx.assert(id, 422, 'id 不能为空');

    if (ctx.params.shop_id !== undefined) {
      body.shop_id = ctx.params.shop_id;
    }

    // 处理文件上传
    const files = ctx.request.files;
    if (files && files.length) {
      const uploadRes = await service.upload.image(files[0], 'services');
      body.avatar = uploadRes.url;
    }

    // 兼容前端传入的字段名
    if (body.name && !body.service_name) body.service_name = body.name;
    if (body.contact && !body.contact_value) body.contact_value = body.contact;
    if (body.link && !body.jump_url) body.jump_url = body.link;
    if (body.image && !body.avatar) body.avatar = body.image;
    if (body.imageUrl && !body.avatar) body.avatar = body.imageUrl;

    // 如果是 Telegram 或 WhatsApp 类型，且前端没有传入 jump_url，但传了 contact_value (比如 tg号)
    // 我们可以自动拼接 jump_url
    if (body.contact_value && !body.jump_url) {
      // 交由 service 层统一处理，以确保能获取到原数据中的类型
      // controller 只需要透传前端字段即可
    }

    const adminId = ctx.state.adminInner.adminInnerId;
    await ctx.service.h5Service.update(id, body, adminId, ctx.params.shop_id);
    ctx.body = { code: 200, message: '编辑成功' };
  }

  /**
   * 删除客服
   */
  async remove() {
    const { ctx } = this;
    const id = ctx.params.id || ctx.query.id;
    ctx.assert(id, 422, 'id 不能为空');
    await ctx.service.h5Service.destroy(id, ctx.params.shop_id);
    ctx.body = { code: 200, message: '删除成功' };
  }

  /**
   * 导入全局客服模板到指定店铺
   */
  async importGlobalServices() {
    const { ctx } = this;
    const shopId = ctx.params.shop_id;
    ctx.assert(shopId, 422, 'shop_id 不能为空');
    const adminId = ctx.state.adminInner.adminInnerId;

    await ctx.service.h5Service.importGlobalServices(shopId, adminId);
    ctx.body = { code: 200, message: '导入成功' };
  }
}

module.exports = H5ServiceController;
