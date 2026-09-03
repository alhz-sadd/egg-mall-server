'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-公告
 * 管理端公告控制器
 */
class NoticeController extends Controller {
  /**
   * @summary 管理端公告列表
   * @description 管理员查看全部状态公告，支持关键词、状态筛选
   * @router get /api/admin/notices
   * @request header string Authorization Bearer admin token
   * @request query string keyword 关键词（按标题模糊搜索）
   * @request query integer status 状态：1启用 0禁用
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 公告列表
   */
  async adminList() {
    const { ctx, service } = this;
    const { keyword, status, page, page_size } = ctx.query;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.notice.adminList({ keyword, status, page, page_size }, adminId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 创建公告
   * @description 创建新公告
   * @router post /api/admin/notices
   * @request header string Authorization Bearer admin token
   * @request body NoticeRequest *body 公告信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const notice = await service.notice.create(ctx.request.body, adminId);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: notice,
    };
  }

  /**
   * @summary 更新公告
   * @description 根据公告ID更新信息
   * @router put /api/admin/notices/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 公告ID
   * @request body NoticeRequest *body 公告信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const notice = await service.notice.update(id, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: notice,
    };
  }

  /**
   * @summary 删除公告
   * @description 根据公告ID软删除（状态改为禁用）
   * @router delete /api/admin/notices/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 公告ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    await service.notice.destroy(id, adminId);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = NoticeController;
