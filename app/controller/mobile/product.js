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
    // 同时兼容 type 和 category_id，兼容 pageSize 和 page_size，以及 order_by
    const { type, category_id, keyword, page, page_size, pageSize, is_home, order_by } = ctx.query;

    const queryCategoryId = category_id || type;
    const queryPageSize = pageSize || page_size;

    // 移动端商品列表，只返回上架（status=1）商品
    const result = await service.goods.list({
      category_id: queryCategoryId,
      goods_name: keyword,
      status: 1,
      is_home,
      page,
      page_size: queryPageSize,
      order_by,
    });

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

    const product = await service.goods.detail(id);

    ctx.body = {
      code: 200,
      message: 'success',
      data: product,
    };
  }
}

module.exports = ProductController;
