'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

/**
 * 公告服务层
 */
class NoticeService extends Service {
  /**
   * 获取公告列表
   * @param {Object} query 查询参数
   * @param {number|null} adminId 可选的店铺ID，null 表示全局公告
   * @return {Object} 分页列表
   */
  async list(query = {}, adminId) {
    const { ctx } = this;
    const { keyword, page = 1, page_size = 10 } = query;

    const where = { status: 1 };
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    if (keyword) {
      where.title = { [Op.like]: `%${keyword}%` };
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.Notice.findAndCountAll({
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
   * 管理端公告列表
   * 返回全部状态，支持状态筛选
   * @param {Object} query 查询参数
   * @param adminId
   * @return {Object} 分页列表
   */
  async adminList(query = {}, adminId) {
    const { ctx } = this;
    const { keyword, status, page = 1, page_size = 10 } = query;

    const where = {};
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    if (keyword) {
      where.title = { [Op.like]: `%${keyword}%` };
    }
    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.Notice.findAndCountAll({
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
   * 获取公告详情
   * @param {number} id 公告ID
   * @return {Object} 公告详情
   */
  async detail(id) {
    const { ctx } = this;
    const notice = await ctx.model.Notice.findByPk(id);
    if (!notice || notice.status !== 1) {
      ctx.throw(404, '公告不存在或已禁用');
    }
    return notice;
  }

  /**
   * 创建公告
   * @param {Object} payload 公告数据
   * @param adminId
   * @return {Object} 创建后的公告
   */
  async create(payload, adminId) {
    const { ctx } = this;
    this.validatePayload(payload);

    if (adminId !== undefined) {
      payload.admin_id = adminId;
    }

    const notice = await ctx.model.Notice.create(payload);
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
    const notice = await ctx.model.Notice.findByPk(id);
    if (!notice || notice.status !== 1) {
      ctx.throw(404, '公告不存在或已禁用');
    }

    await notice.update(payload);
    return notice;
  }

  /**
   * 删除公告（物理删除）
   * @param {number} id 公告ID
   * @param adminId
   */
  async destroy(id, adminId) {
    const { ctx } = this;
    const notice = await ctx.model.Notice.findByPk(id);
    if (!notice) {
      ctx.throw(404, '公告不存在');
    }
    if (adminId !== undefined && notice.admin_id !== adminId) {
      ctx.throw(403, '无权操作该店铺公告');
    }

    await notice.destroy();
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
