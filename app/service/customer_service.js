'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

/**
 * 客服服务层
 */
class CustomerServiceService extends Service {
  /**
   * 获取客服列表
   * @param {Object} query 查询参数
   * @return {Object} 分页列表
   */
  async list(query = {}) {
    const { ctx } = this;
    const { keyword, page = 1, page_size = 10 } = query;

    const where = { status: 1 };
    if (keyword) {
      where.name = { [Op.like]: `%${keyword}%` };
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.CustomerService.findAndCountAll({
      where,
      order: [[ 'sort', 'DESC' ], [ 'id', 'DESC' ]],
      offset,
      limit,
    });

    return {
      list: rows,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 管理端客服列表
   * 返回全部状态，支持状态筛选
   * @param {Object} query 查询参数
   * @return {Object} 分页列表
   */
  async adminList(query = {}) {
    const { ctx } = this;
    const { keyword, status, page = 1, page_size = 10 } = query;

    const where = {};
    if (keyword) {
      where.name = { [Op.like]: `%${keyword}%` };
    }
    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.CustomerService.findAndCountAll({
      where,
      order: [[ 'sort', 'DESC' ], [ 'id', 'DESC' ]],
      offset,
      limit,
    });

    return {
      list: rows,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 获取客服详情
   * @param {number} id 客服ID
   * @return {Object} 客服详情
   */
  async detail(id) {
    const { ctx } = this;
    const customerService = await ctx.model.CustomerService.findByPk(id);
    if (!customerService || customerService.status !== 1) {
      ctx.throw(404, '客服不存在或已禁用');
    }
    return customerService;
  }

  /**
   * 创建客服
   * @param {Object} payload 客服数据
   * @return {Object} 创建后的客服
   */
  async create(payload) {
    const { ctx } = this;

    ctx.assert(payload.name, 422, '客服名称不能为空');

    const customerService = await ctx.model.CustomerService.create(payload);
    return customerService.toJSON();
  }

  /**
   * 更新客服
   * @param {number} id 客服ID
   * @param {Object} payload 更新数据
   * @return {Object} 更新后的客服
   */
  async update(id, payload) {
    const { ctx } = this;
    const customerService = await ctx.model.CustomerService.findByPk(id);
    if (!customerService || customerService.status !== 1) {
      ctx.throw(404, '客服不存在或已禁用');
    }

    await customerService.update(payload);
    return customerService;
  }

  /**
   * 删除客服（物理删除）
   * @param {number} id 客服ID
   */
  async destroy(id) {
    const { ctx } = this;
    const customerService = await ctx.model.CustomerService.findByPk(id);
    if (!customerService) {
      ctx.throw(404, '客服不存在');
    }

    await customerService.destroy();
  }
}

module.exports = CustomerServiceService;
