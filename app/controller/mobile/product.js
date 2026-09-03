'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-商品库
 * 移动端商品控制器
 */
class ProductController extends Controller {
  /**
   * @summary 获取商品列表
   * @description 移动端商品列表，仅返回已上架（status=1）商品，支持类型、关键词搜索
   * @router get /api/mobile/products
   * @request query integer type 商品类型：0全部 1移动设备 2家电 3电脑设备 4体育 5时尚
   * @request query string keyword 关键词（按名称模糊搜索）
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 商品列表
   */
  async index() {
    const { ctx, service } = this;
    const { type, keyword, page, page_size } = ctx.query;
    const locale = ctx.locale || 'zh-CN';

    // 移动端商品列表与管理端共用查询逻辑，但只返回上架（status=1）商品
    const result = await service.product.adminList({ type, keyword, status: 1, page, page_size, locale });

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取商品详情
   * @description 根据商品ID获取详情
   * @router get /api/mobile/products/:id
   * @request path integer *id 商品ID
   * @response 200 ApiResponse 商品详情
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const locale = ctx.locale || 'zh-CN';

    const product = await service.product.detail(id, locale);

    ctx.body = {
      code: 200,
      message: 'success',
      data: product,
    };
  }
}

module.exports = ProductController;
