'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-商品分类
 * 移动端商品分类控制器
 */
class CategoryController extends Controller {
  /**
   * @summary 获取分类列表
   * @description 获取商品分类列表，支持按父分类筛选
   * @router get /api/mobile/categories
   * @request query integer parent_id 父分类ID
   * @response 200 ApiResponse 分类列表
   */
  async index() {
    const { ctx, service } = this;
    const { parent_id } = ctx.query;

    const list = await service.category.list({ parent_id });

    ctx.body = {
      code: 200,
      message: 'success',
      data: list,
    };
  }

  /**
   * @summary 获取分类树形结构
   * @description 获取商品分类的树形结构
   * @router get /api/mobile/categories/tree
   * @response 200 ApiResponse 分类树
   */
  async tree() {
    const { ctx, service } = this;

    const tree = await service.category.tree();

    ctx.body = {
      code: 200,
      message: 'success',
      data: tree,
    };
  }
}

module.exports = CategoryController;
