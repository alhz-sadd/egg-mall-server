'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-轮播图
 * 管理端轮播图控制器
 */
class BannerController extends Controller {
  /**
   * @summary 管理端轮播图列表
   * @description 管理员查看全部状态轮播图，支持状态筛选
   * @router get /api/admin-inner/banners
   * @request header string Authorization Bearer admin token
   * @request query integer status 状态：1启用 0禁用
   * @response 200 ApiResponse 轮播图列表
   */
  async adminList() {
    const { ctx, service } = this;
    const { status } = ctx.query;

    const result = await service.banner.adminList({ status });

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * 兼容前端驼峰字段名
   * @param {Object} body 请求体
   */
  _normalizePayload(body) {
    if (body.imageUrl !== undefined && body.image === undefined) {
      body.image = body.imageUrl;
    }
  }

  /**
   * 处理 multipart 上传的轮播图图片
   * @param {Object} body 请求体
   */
  async _processImage(body) {
    const { ctx, service } = this;
    const files = ctx.request.files;
    if (files && files.length) {
      const result = await service.upload.image(files[0], 'banners');
      body.image = result.url;
    }
  }

  /**
   * @summary 创建轮播图
   * @description 创建新轮播图，支持 JSON 或 multipart/form-data 上传图片
   * @router post /api/admin-inner/banners
   * @request header string Authorization Bearer admin token
   * @request body BannerRequest *body 轮播图信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const body = { ...ctx.request.body };

    this._normalizePayload(body);
    await this._processImage(body);

    const banner = await service.banner.create(body);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: banner,
    };
  }

  /**
   * @summary 更新轮播图
   * @description 根据轮播图ID更新信息
   * @router put /api/admin-inner/banners/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 轮播图ID
   * @request body BannerRequest *body 轮播图信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const body = { ...ctx.request.body };

    this._normalizePayload(body);
    await this._processImage(body);

    const banner = await service.banner.update(id, body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: banner,
    };
  }

  /**
   * @summary 删除轮播图
   * @description 根据轮播图ID软删除（状态改为禁用）
   * @router delete /api/admin-inner/banners/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 轮播图ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    await service.banner.destroy(id);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = BannerController;
