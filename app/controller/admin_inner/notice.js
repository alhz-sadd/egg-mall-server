'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 总后台-公告管理
 * 内部管理系统公告控制器，用于发布全平台/所有店铺可见的公告
 */
class NoticeController extends Controller {
  /**
   * @summary 总后台公告列表
   * @description 获取所有店铺的公告列表，不进行 admin_id 隔离
   * @router get /api/admin-inner/notices
   */
  async index() {
    const { ctx, service } = this;
    const { keyword, status, page, page_size } = ctx.query;

    // 传入 undefined 作为 adminId，代表不按店铺隔离，查询所有
    const result = await service.notice.adminList({ keyword, status, page, page_size }, undefined);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 发布全平台公告
   * @description 创建新公告，不绑定特定 admin_id
   * @router post /api/admin-inner/notices
   */
  async create() {
    const { ctx, service } = this;

    // adminId 传 null，表示这是一个全平台/系统级公告
    const notice = await service.notice.create(ctx.request.body, null);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: notice,
    };
  }

  /**
   * @summary 获取公告详情
   * @router get /api/admin-inner/notices/:id
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const notice = await ctx.model.Notice.findByPk(id);

    if (!notice) {
      ctx.throw(404, '公告不存在');
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: notice,
    };
  }

  /**
   * @summary 更新公告
   * @router put /api/admin-inner/notices/:id
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    // 直接调用 service.update，不校验所属权
    const notice = await service.notice.update(id, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: notice,
    };
  }

  /**
   * @summary 删除公告
   * @router delete /api/admin-inner/notices/:id
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    // 传入 undefined 作为 adminId，绕过所属权校验
    await service.notice.destroy(id, undefined);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = NoticeController;
