'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-商品库
 * 管理端商品控制器
 */
class ProductController extends Controller {
  /**
   * @summary 管理端商品列表
   * @description 管理员查看全部状态商品，支持类型、关键词、状态、价格区间筛选
   * @router get /api/admin-inner/products
   * @request header string Authorization Bearer admin token
   * @request query integer type 商品类型：0全部 1移动设备 2家电 3电脑设备 4体育 5时尚
   * @request query string keyword 关键词（按名称模糊搜索）
   * @request query integer status 状态：1上架 0下架
   * @request query number price_min 最低价格
   * @request query number price_max 最高价格
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 商品列表
   */
  async adminList() {
    const { ctx, service } = this;
    const { type, keyword, status, price_min, price_max, page, page_size } = ctx.query;

    const result = await service.product.adminList({ type, keyword, status, price_min, price_max, page, page_size });

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * 兼容前端字段名
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
   * 处理 multipart 上传的商品图片
   * 多个文件会生成图片地址数组，并默认把第一张设为缩略图
   * @param {Object} body 请求体
   */
  async _processImages(body) {
    const { ctx, service } = this;
    const files = ctx.request.files;
    if (files && files.length) {
      const urls = [];
      for (const file of files) {
        const result = await service.upload.image(file, 'products');
        urls.push(result.url);
      }
      body.images = urls;
      if (!body.img) {
        body.img = urls[0];
      }
    }
  }

  /**
   * @summary 创建商品
   * @description 创建新商品，支持 JSON 或 multipart/form-data 上传图片
   * @router post /api/admin-inner/products
   * @request header string Authorization Bearer admin token
   * @request body ProductRequest *body 商品信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const body = { ...ctx.request.body };

    this._normalizePayload(body);
    await this._processImages(body);

    const product = await service.product.create(body);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: product,
    };
  }

  /**
   * @summary 更新商品
   * @description 根据商品ID更新商品信息
   * @router put /api/admin-inner/products/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 商品ID
   * @request body ProductRequest *body 商品信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const body = { ...ctx.request.body };
    this._normalizePayload(body);
    await this._processImages(body);

    const product = await service.product.update(id, body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: product,
    };
  }

  /**
   * @summary 删除商品
   * @description 根据商品ID软删除商品（将状态改为下架）
   * @router delete /api/admin-inner/products/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 商品ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    await service.product.destroy(id);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = ProductController;
