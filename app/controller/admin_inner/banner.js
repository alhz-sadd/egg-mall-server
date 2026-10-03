'use strict';

const Controller = require('egg').Controller;

class BannerController extends Controller {
  // =============== 店铺轮播图管理接口 (shop_id > 0) ===============

  /**
   * @summary 获取店铺轮播图模板
   * @router get /api/admin-inner/shops/:shop_id/banners
   */
  async adminGet() {
    const { ctx, service } = this;
    const shopId = ctx.params.shop_id;
    const data = await service.banner.adminList(shopId, ctx.query);

    ctx.body = { code: 200, message: 'success', data };
  }

  /**
   * @summary 创建/更新店铺轮播图模板
   * @router post /api/admin-inner/shops/:shop_id/banners
   */
  async create() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    const shopId = ctx.params.shop_id;

    const data = await service.banner.create(body, shopId);

    ctx.body = { code: 200, message: '创建成功', data };
  }

  /**
   * @summary 更新店铺轮播图模板
   * @router put /api/admin-inner/shops/:shop_id/banners/:id
   */
  async update() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    const shopId = ctx.params.shop_id;

    if (ctx.params.id) {
      body.id = ctx.params.id;
    }

    if (!body.id) {
      ctx.throw(400, '编辑操作必须传递模板的 id');
    }

    const data = await service.banner.create(body, shopId);

    ctx.body = { code: 200, message: '更新成功', data };
  }

  /**
   * @summary 单独修改店铺轮播图模板状态
   * @router put /api/admin-inner/shops/:shop_id/banners/:id/status
   */
  async updateStatus() {
    const { ctx, service } = this;
    const id = ctx.params.id;
    const { status } = ctx.request.body;
    const shopId = ctx.params.shop_id;

    if (!id) {
      ctx.throw(400, '必须传递模板的 id');
    }
    if (status === undefined) {
      ctx.throw(400, '必须传递 status 字段');
    }

    const data = await service.banner.updateStatus(id, status, shopId);

    ctx.body = { code: 200, message: '状态更新成功', data };
  }

  /**
   * @summary 删除店铺轮播图模板
   * @router delete /api/admin-inner/shops/:shop_id/banners/:id
   */
  async destroy() {
    const { ctx, service } = this;
    const shopId = ctx.params.shop_id;
    const id = ctx.params.id || ctx.request.body.id;
    await service.banner.destroy(id, shopId);

    ctx.body = { code: 200, message: '删除成功' };
  }

  /**
   * @summary 绑定平台轮播图模板到店铺
   * @router post /api/admin-inner/shops/:shop_id/banners/bind
   */
  async bindTemplate() {
    const { ctx, service } = this;
    const shopId = ctx.params.shop_id;
    const { template_id } = ctx.request.body;

    if (!template_id) {
      ctx.throw(400, '必须传递 template_id 字段');
    }

    const data = await service.banner.bindTemplate(template_id, shopId);

    ctx.body = { code: 200, message: '绑定模板成功', data };
  }

  // =============== 全局轮播图模板管理接口 (shop_id = 0) ===============

  /**
   * @summary 总后台获取轮播图模板
   * @router get /api/admin-inner/h5-config/banners
   */
  async adminGetGlobal() {
    const { ctx, service } = this;
    const data = await service.banner.adminList(0, ctx.query);

    ctx.body = { code: 200, message: 'success', data };
  }

  /**
   * @summary 创建/更新全局轮播图模板
   * @router post /api/admin-inner/h5-config/banners
   */
  async createGlobal() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    const data = await service.banner.create(body, 0);

    ctx.body = { code: 200, message: '创建成功', data };
  }

  /**
   * @summary 更新全局轮播图模板
   * @router put /api/admin-inner/h5-config/banners/:id
   */
  async updateGlobal() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    if (ctx.params.id) {
      body.id = ctx.params.id;
    }
    if (!body.id) {
      ctx.throw(400, '编辑操作必须传递模板的 id');
    }
    const data = await service.banner.create(body, 0);

    ctx.body = { code: 200, message: '更新成功', data };
  }

  /**
   * @summary 单独修改全局轮播图模板状态
   * @router put /api/admin-inner/h5-config/banners/:id/status
   */
  async updateStatusGlobal() {
    const { ctx, service } = this;
    const id = ctx.params.id;
    const { status } = ctx.request.body;
    if (!id) {
      ctx.throw(400, '必须传递模板的 id');
    }
    if (status === undefined) {
      ctx.throw(400, '必须传递 status 字段');
    }
    const data = await service.banner.updateStatus(id, status, 0);

    ctx.body = { code: 200, message: '状态更新成功', data };
  }

  /**
   * @summary 删除全局轮播图模板
   * @router delete /api/admin-inner/h5-config/banners/:id
   */
  async destroyGlobal() {
    const { ctx, service } = this;
    const id = ctx.params.id || ctx.request.body.id;
    await service.banner.destroy(id, 0);

    ctx.body = { code: 200, message: '删除成功' };
  }
}

module.exports = BannerController;
