'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-公告
 * 移动端公告控制器
 */
class NoticeController extends Controller {
  /**
   * @summary 获取公告列表
   * @description 移动端公告列表，仅返回启用状态（status=1）且为全平台（admin_id=null）的公告，支持关键词搜索
   * @router get /api/mobile/notices
   * @request query string keyword 关键词（按标题模糊搜索）
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 公告列表
   */
  async index() {
    const { ctx, service } = this;
    const { keyword, page, page_size } = ctx.query;

    // 传入 null，强制只获取总后台（admin-inner）发布的全局公告
    const result = await service.notice.list({ keyword, page, page_size }, null);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取公告详情
   * @description 根据公告ID获取详情
   * @router get /api/mobile/notices/:id
   * @request path integer *id 公告ID
   * @response 200 ApiResponse 公告详情
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    const notice = await service.notice.detail(id);

    ctx.body = {
      code: 200,
      message: 'success',
      data: notice,
    };
  }
}

module.exports = NoticeController;
