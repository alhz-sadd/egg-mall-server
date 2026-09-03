'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-任务库
 * 管理端任务控制器
 */
class TaskController extends Controller {
  /**
   * @summary 管理端任务列表
   * @description 管理员查看全部状态任务，支持关键词、状态、奖励区间筛选
   * @router get /api/admin-inner/tasks
   * @request header string Authorization Bearer admin token
   * @request query string keyword 关键词（按名称模糊搜索）
   * @request query integer status 状态：1启用 0禁用
   * @request query number price_min 最低奖励
   * @request query number price_max 最高奖励
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 任务列表
   */
  async adminList() {
    const { ctx, service } = this;
    const { keyword, status, price_min, price_max, page, page_size } = ctx.query;

    const result = await service.task.adminList({ keyword, status, price_min, price_max, page, page_size });

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * 兼容前端驼峰字段名及单图上传字段
   * @param {Object} body 请求体
   */
  _normalizePayload(body) {
    if (body.mainImage !== undefined && body.img === undefined) {
      body.img = body.mainImage;
    }
    if (body.imageUrl !== undefined && body.img === undefined) {
      body.img = body.imageUrl;
    }
    if (body.imageUrl !== undefined && body.images === undefined) {
      body.images = [ body.imageUrl ];
    }
  }

  /**
   * 处理 multipart 上传的任务图片
   * 多个文件会生成图片地址数组，并默认把第一张设为主图
   * @param {Object} body 请求体
   */
  async _processImages(body) {
    const { ctx, service } = this;
    const files = ctx.request.files;
    if (files && files.length) {
      const urls = [];
      for (const file of files) {
        const result = await service.upload.image(file, 'tasks');
        urls.push(result.url);
      }
      body.images = urls;
      if (!body.img) {
        body.img = urls[0];
      }
    }
  }

  /**
   * @summary 创建任务
   * @description 创建新任务，支持 JSON 或 multipart/form-data 上传图片
   * @router post /api/admin-inner/tasks
   * @request header string Authorization Bearer admin token
   * @request body TaskRequest *body 任务信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const body = { ...ctx.request.body };

    this._normalizePayload(body);
    await this._processImages(body);

    const task = await service.task.create(body);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: task,
    };
  }

  /**
   * @summary 更新任务
   * @description 根据任务ID更新信息
   * @router put /api/admin-inner/tasks/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 任务ID
   * @request body TaskRequest *body 任务信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const body = { ...ctx.request.body };
    this._normalizePayload(body);
    await this._processImages(body);

    const task = await service.task.update(id, body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: task,
    };
  }

  /**
   * @summary 删除任务
   * @description 根据任务ID软删除（状态改为禁用）
   * @router delete /api/admin-inner/tasks/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 任务ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    await service.task.destroy(id);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }

}

module.exports = TaskController;
