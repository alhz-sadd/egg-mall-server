'use strict';

const Controller = require('egg').Controller;

class SalespersonController extends Controller {
  /**
   * 获取业务员账号列表
   * 支持通过 bind_admin_id 过滤
   */
  async index() {
    const { ctx, service } = this;
    const result = await service.adminUser.salespersonList(ctx.query);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * 获取指定商家下的业务员列表
   */
  async listByMerchant() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    const query = {
      ...ctx.query,
      bind_admin_id: id,
    };

    const result = await service.adminUser.salespersonList(query);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * 创建业务员账号
   */
  async create() {
    const { ctx, service } = this;
    const payload = ctx.request.body;

    // 强制指定角色为 2 (业务员)
    payload.role = 2;
    payload.roleName = '业务员';
    payload.roleKey = 'user';

    // 内部系统创建，操作者角色传 1（超级管理员/系统），或者不影响权限校验的值
    const admin = await service.adminUser.create(payload, 1);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: admin,
    };
  }

  /**
   * 更新业务员账号
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    if (!id || id === 'undefined' || id === 'null') {
      ctx.throw(400, '请在URL中提供正确的业务员ID');
    }

    // 检查目标账号是否为业务员
    const targetAdmin = await ctx.model.AdminUser.findByPk(id);
    if (!targetAdmin) {
      ctx.throw(404, '业务员不存在或ID不正确');
    }
    if (targetAdmin.role !== 2) {
      ctx.throw(403, '只能修改业务员账号');
    }

    const admin = await service.adminUser.update(id, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: admin,
    };
  }

  /**
   * 删除业务员账号
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    if (!id || id === 'undefined' || id === 'null') {
      ctx.throw(400, '请在URL中提供正确的业务员ID');
    }

    // 检查目标账号是否为业务员
    const targetAdmin = await ctx.model.AdminUser.findByPk(id);
    if (!targetAdmin) {
      ctx.throw(404, '业务员不存在或ID不正确');
    }
    if (targetAdmin.role !== 2) {
      ctx.throw(403, '只能删除业务员账号');
    }

    await service.adminUser.destroy(id);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = SalespersonController;
