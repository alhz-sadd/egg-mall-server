'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

/**
 * 客服服务层
 */
class CustomerServiceService extends Service {
  /**
   * 获取客服列表 (C端)
   * @param {Object} query 查询参数
   * @return {Object} 分页列表
   */
  async list(query = {}) {
    const { ctx } = this;
    const { keyword, page = 1, page_size = 10 } = query;

    const where = { status: 1, is_deleted: 0 };
    if (keyword) {
      where.service_name = { [Op.like]: `%${keyword}%` };
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.SysH5Service.findAndCountAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
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
   * @param {Object} query 查询参数
   * @return {Object} 分页列表
   */
  async adminList(query = {}) {
    const { ctx } = this;
    const { keyword, status, page = 1, page_size = 10 } = query;

    const where = { is_deleted: 0 };
    if (keyword) {
      where.service_name = { [Op.like]: `%${keyword}%` };
    }
    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.SysH5Service.findAndCountAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
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
    const customerService = await ctx.model.SysH5Service.findOne({
      where: { id, is_deleted: 0 },
    });
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

    ctx.assert(payload.service_name || payload.name, 422, '客服名称不能为空');

    const customerService = await ctx.model.SysH5Service.create({
      service_name: payload.service_name || payload.name,
      avatar: payload.avatar || payload.image,
      contact_type: payload.contact_type || 1,
      contact_value: payload.contact_value || payload.contact,
      jump_url: payload.jump_url || payload.link,
      sort: payload.sort || 0,
      status: payload.status !== undefined ? payload.status : 1,
      remark: payload.remark,
    });
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
    const customerService = await ctx.model.SysH5Service.findOne({
      where: { id, is_deleted: 0 },
    });
    if (!customerService) {
      ctx.throw(404, '客服不存在');
    }

    const updateData = {};
    if (payload.service_name || payload.name) updateData.service_name = payload.service_name || payload.name;
    if (payload.avatar || payload.image) updateData.avatar = payload.avatar || payload.image;
    if (payload.contact_type) updateData.contact_type = payload.contact_type;
    if (payload.contact_value || payload.contact) updateData.contact_value = payload.contact_value || payload.contact;
    if (payload.jump_url || payload.link) updateData.jump_url = payload.jump_url || payload.link;
    if (payload.sort !== undefined) updateData.sort = payload.sort;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.remark !== undefined) updateData.remark = payload.remark;

    await customerService.update(updateData);
    return customerService;
  }

  /**
   * 删除客服
   * @param {number} id 客服ID
   */
  async destroy(id) {
    const { ctx } = this;
    const customerService = await ctx.model.SysH5Service.findOne({
      where: { id, is_deleted: 0 },
    });
    if (!customerService) {
      ctx.throw(404, '客服不存在');
    }

    await customerService.update({ is_deleted: 1 });
  }
}

module.exports = CustomerServiceService;
