'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 总后台-规则管理
 * 内部管理系统规则控制器，全站仅维护一条规则记录，不进行 admin_id 隔离
 */
class RuleController extends Controller {
  /**
   * @summary 总后台获取规则
   * @description 获取完整规则数据（含状态）
   * @router get /api/admin-inner/h5-config/rules
   */
  async adminGet() {
    const { ctx, service } = this;
    // 规则是全局唯一的，直接调用 service 的查询方法即可，不带 admin_id
    const data = await service.rule.adminGet();

    ctx.body = {
      code: 200,
      message: 'success',
      data,
    };
  }

  /**
   * @summary 创建/更新规则图片
   * @description 创建规则图片数组；若已存在则覆盖更新
   * @router post /api/admin-inner/h5-config/rules
   */
  async create() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    // 规则全局唯一，直接更新
    const data = await service.rule.create(body);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data,
    };
  }

  /**
   * @summary 更新规则图片/结构
   * @description 更新规则内容
   * @router put /api/admin-inner/h5-config/rules
   */
  async update() {
    const { ctx, service } = this;
    const body = ctx.request.body;

    // 兼容通过 params 传递 id (例如 /rules/:id)
    if (ctx.params.id) {
      body.id = ctx.params.id;
    }

    if (!body.id) {
      ctx.throw(400, '编辑操作必须传递规则的 id');
    }

    const data = await service.rule.create(body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data,
    };
  }

  /**
   * @summary 单独修改规则状态
   * @description 修改状态，并保证只有一个处于启用状态
   * @router put /api/admin-inner/h5-config/rules/:id/status
   */
  async updateStatus() {
    const { ctx, service } = this;
    const id = ctx.params.id;
    const { status } = ctx.request.body;

    if (!id) {
      ctx.throw(400, '必须传递规则的 id');
    }
    if (status === undefined) {
      ctx.throw(400, '必须传递 status 字段');
    }

    const data = await service.rule.updateStatus(id, status);

    ctx.body = {
      code: 200,
      message: '状态更新成功',
      data,
    };
  }

  /**
   * @summary 删除规则
   * @description 删除规则（软删除，将状态改为禁用）
   * @router delete /api/admin-inner/h5-config/rules
   */
  async destroy() {
    const { ctx, service } = this;
    await service.rule.destroy();

    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }
}

module.exports = RuleController;
