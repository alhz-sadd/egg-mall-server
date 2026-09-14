'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

/**
 * 公告服务层
 */
class NoticeService extends Service {
  /**
   * 获取公告列表 (C端)
   * @param {Object} query 查询参数
   * @return {Object} 分页列表
   */
  async list(query = {}) {
    const { ctx } = this;
    const { keyword, page = 1, page_size = 10 } = query;

    const where = { config_type: 2, status: 1, is_deleted: 0 };
    if (keyword) {
      where.title = { [Op.like]: `%${keyword}%` };
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.SysH5Config.findAndCountAll({
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
   * 管理端公告列表
   * @param {Object} query 查询参数
   * @return {Object} 分页列表
   */
  async adminList(query = {}) {
    const { ctx } = this;
    const { keyword, status, page = 1, page_size = 10 } = query;

    const where = { config_type: 2, is_deleted: 0 };
    if (keyword) {
      where.title = { [Op.like]: `%${keyword}%` };
    }
    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.SysH5Config.findAndCountAll({
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
   * 获取公告详情
   * @param {number} id 公告ID
   * @return {Object} 公告详情
   */
  async detail(id) {
    const { ctx } = this;
    const notice = await ctx.model.SysH5Config.findOne({
      where: { id, config_type: 2, is_deleted: 0 },
    });
    if (!notice || notice.status !== 1) {
      ctx.throw(404, '公告不存在或已禁用');
    }
    return notice;
  }

  /**
   * 创建公告
   * @param {Object} payload 公告数据
   * @return {Object} 创建后的公告
   */
  async create(payload) {
    const { ctx } = this;
    this.validatePayload(payload);

    const notice = await ctx.model.SysH5Config.create({
      config_type: 2,
      title: payload.title,
      content: payload.content,
      sort: payload.sort || 0,
      status: payload.status !== undefined ? payload.status : 1,
      remark: payload.remark,
    });
    return notice.toJSON();
  }

  /**
   * 更新公告
   * @param {number} id 公告ID
   * @param {Object} payload 公告数据
   * @return {Object} 更新后的公告
   */
  async update(id, payload) {
    const { ctx } = this;
    const notice = await ctx.model.SysH5Config.findOne({
      where: { id, config_type: 2, is_deleted: 0 },
    });
    if (!notice) {
      ctx.throw(404, '公告不存在');
    }

    await notice.update(payload);
    return notice.toJSON();
  }

  /**
   * 删除公告
   * @param {number} id 公告ID
   */
  async destroy(id) {
    const { ctx } = this;
    const notice = await ctx.model.SysH5Config.findOne({
      where: { id, config_type: 2, is_deleted: 0 },
    });
    if (!notice) {
      ctx.throw(404, '公告不存在');
    }

    await notice.update({ is_deleted: 1 });
  }

  /**
   * 校验公告必填字段
   * @param {Object} payload 公告数据
   */
  validatePayload(payload) {
    const { ctx } = this;
    ctx.assert(payload.title, 422, '公告标题不能为空');
    ctx.assert(payload.content, 422, '公告内容不能为空');
  }
}

module.exports = NoticeService;
