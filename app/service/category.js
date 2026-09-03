'use strict';

const Service = require('egg').Service;

/**
 * 商品分类服务层
 */
class CategoryService extends Service {
  /**
   * 获取分类列表
   * @param {Object} query 查询条件
   * @return {Array} 分类列表
   */
  async list(query = {}) {
    const { ctx } = this;
    const where = { status: 1 };
    if (query.parent_id !== undefined) {
      where.parent_id = query.parent_id;
    }

    return await ctx.model.Category.findAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'ASC' ]],
    });
  }

  /**
   * 获取分类树形结构
   * @param adminId
   * @return {Array} 树形分类列表
   */
  async tree(adminId) {
    const { ctx } = this;
    const where = { status: 1 };
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    const categories = await ctx.model.Category.findAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'ASC' ]],
    });

    return this.buildTree(categories);
  }

  /**
   * 构建分类树
   * @param {Array} categories 分类数据
   * @param {number} parentId 父分类ID
   * @return {Array} 树形结构
   */
  buildTree(categories, parentId = 0) {
    const result = [];
    for (const item of categories) {
      if (item.parent_id === parentId) {
        const children = this.buildTree(categories, item.id);
        const node = item.toJSON ? item.toJSON() : item;
        if (children.length) {
          node.children = children;
        }
        result.push(node);
      }
    }
    return result;
  }
}

module.exports = CategoryService;
