'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 总后台-规则管理
 * 内部管理系统规则控制器，全站仅维护一条规则记录，不进行 admin_id 隔离
 */
class RuleController extends Controller {
  // =============== 店铺规则管理接口 (shop_id > 0) ===============

  /**
   * @summary 获取店铺规则
   * @description 获取完整规则数据（含状态）
   * @router get /api/admin-inner/shops/:shop_id/rules
   */
  async adminGet() {
    const { ctx, service } = this;
    const shopId = ctx.params.shop_id;
    const data = await service.rule.adminGet(shopId);

    ctx.body = {
      code: 200,
      message: 'success',
      data,
    };
  }

  /**
   * @summary 创建/更新店铺规则
   * @router post /api/admin-inner/shops/:shop_id/rules
   */
  async create() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    const shopId = ctx.params.shop_id;

    const data = await service.rule.create(body, shopId);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data,
    };
  }

  /**
   * @summary 更新店铺规则
   * @router put /api/admin-inner/shops/:shop_id/rules/:id
   */
  async update() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    const shopId = ctx.params.shop_id;

    if (ctx.params.id) {
      body.id = ctx.params.id;
    }

    if (!body.id) {
      ctx.throw(400, '编辑操作必须传递规则的 id');
    }

    const data = await service.rule.create(body, shopId);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data,
    };
  }

  /**
   * @summary 单独修改店铺规则状态
   * @router put /api/admin-inner/shops/:shop_id/rules/:id/status
   */
  async updateStatus() {
    const { ctx, service } = this;
    const id = ctx.params.id;
    const { status } = ctx.request.body;
    const shopId = ctx.params.shop_id;

    if (!id) {
      ctx.throw(400, '必须传递规则的 id');
    }
    if (status === undefined) {
      ctx.throw(400, '必须传递 status 字段');
    }

    const data = await service.rule.updateStatus(id, status, shopId);

    ctx.body = {
      code: 200,
      message: '状态更新成功',
      data,
    };
  }

  /**
   * @summary 删除店铺规则
   * @router delete /api/admin-inner/shops/:shop_id/rules/:id
   */
  async destroy() {
    const { ctx, service } = this;
    const shopId = ctx.params.shop_id;
    const id = ctx.params.id || ctx.request.body.id;
    await service.rule.destroy(id, shopId);

    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }

  /**
   * @summary 绑定平台规则模板到店铺
   * @router post /api/admin-inner/shops/:shop_id/rules/bind
   */
  async bindTemplate() {
    const { ctx, service } = this;
    const shopId = ctx.params.shop_id;
    const { template_id } = ctx.request.body;

    if (!template_id) {
      ctx.throw(400, '必须传递 template_id 字段');
    }

    const data = await service.rule.bindTemplate(template_id, shopId);

    ctx.body = {
      code: 200,
      message: '绑定模板成功',
      data,
    };
  }

  // =============== 全局规则模板管理接口 (shop_id = 0) ===============

  /**
   * @summary 总后台获取规则模板
   * @router get /api/admin-inner/h5-config/rules
   */
  async adminGetGlobal() {
    const { ctx, service } = this;
    // 强制传0查询全局模板
    const data = await service.rule.adminGet(0);

    ctx.body = {
      code: 200,
      message: 'success',
      data,
    };
  }

  /**
   * @summary 创建/更新规则模板
   * @router post /api/admin-inner/h5-config/rules
   */
  async createGlobal() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    const data = await service.rule.create(body, 0);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data,
    };
  }

  /**
   * @summary 更新规则模板
   * @router put /api/admin-inner/h5-config/rules/:id
   */
  async updateGlobal() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    if (ctx.params.id) {
      body.id = ctx.params.id;
    }
    if (!body.id) {
      ctx.throw(400, '编辑操作必须传递规则的 id');
    }
    const data = await service.rule.create(body, 0);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data,
    };
  }

  /**
   * @summary 单独修改规则模板状态
   * @router put /api/admin-inner/h5-config/rules/:id/status
   */
  async updateStatusGlobal() {
    const { ctx, service } = this;
    const id = ctx.params.id;
    const { status } = ctx.request.body;
    if (!id) {
      ctx.throw(400, '必须传递规则的 id');
    }
    if (status === undefined) {
      ctx.throw(400, '必须传递 status 字段');
    }
    const data = await service.rule.updateStatus(id, status, 0);

    ctx.body = {
      code: 200,
      message: '状态更新成功',
      data,
    };
  }

  /**
   * @summary 删除规则模板
   * @router delete /api/admin-inner/h5-config/rules/:id
   */
  async destroyGlobal() {
    const { ctx, service } = this;
    const id = ctx.params.id || ctx.request.body.id;
    await service.rule.destroy(id, 0);

    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }
}

module.exports = RuleController;
