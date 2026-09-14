'use strict';

const Service = require('egg').Service;

class H5ServiceService extends Service {
  /**
   * 分页获取客服列表 (后台)
   * @param query
   */
  async list(query = {}) {
    const { ctx } = this;
    const { service_name, status, page = 1, page_size = 10 } = query;
    const where = { is_deleted: 0 };

    if (service_name) where.service_name = { [ctx.app.Sequelize.Op.like]: `%${service_name}%` };
    if (status !== undefined && status !== '') where.status = status;

    const offset = (page - 1) * page_size;
    const { count, rows } = await ctx.model.SysH5Service.findAndCountAll({
      where,
      include: [
        { model: ctx.model.SysUser, as: 'creator', attributes: [ 'nickname', 'username' ] },
      ],
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
      offset,
      limit: Number(page_size),
    });

    return {
      list: rows,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
      },
    };
  }

  /**
   * 获取启用的客服列表 (H5公开接口)
   */
  async getPublicList() {
    const { ctx } = this;
    return await ctx.model.SysH5Service.findAll({
      where: {
        status: 1,
        is_deleted: 0,
      },
      attributes: [ 'id', 'service_name', 'avatar', 'contact_type', 'contact_value', 'jump_url', 'sort' ],
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
    });
  }

  /**
   * 获取详情
   * @param id
   */
  async detail(id) {
    const { ctx } = this;
    const item = await ctx.model.SysH5Service.findOne({
      where: { id, is_deleted: 0 },
      include: [
        { model: ctx.model.SysUser, as: 'creator', attributes: [ 'nickname', 'username' ] },
        { model: ctx.model.SysUser, as: 'updater', attributes: [ 'nickname', 'username' ] },
      ],
    });
    ctx.assert(item, 404, '客服配置不存在');
    return item;
  }

  /**
   * 创建客服
   * @param payload
   * @param adminId
   */
  async create(payload, adminId) {
    const { ctx } = this;
    return await ctx.model.SysH5Service.create({
      ...payload,
      create_user_id: adminId,
      update_user_id: adminId,
      create_time: new Date(),
      update_time: new Date(),
    });
  }

  /**
   * 更新客服
   * @param id
   * @param payload
   * @param adminId
   */
  async update(id, payload, adminId) {
    const { ctx } = this;
    const item = await ctx.model.SysH5Service.findOne({ where: { id, is_deleted: 0 } });
    ctx.assert(item, 404, '客服配置不存在');

    return await item.update({
      ...payload,
      update_user_id: adminId,
      update_time: new Date(),
    });
  }

  /**
   * 软删除客服
   * @param id
   */
  async destroy(id) {
    const { ctx } = this;
    const item = await ctx.model.SysH5Service.findOne({ where: { id, is_deleted: 0 } });
    ctx.assert(item, 404, '客服配置不存在');
    return await item.update({ is_deleted: 1 });
  }
}

module.exports = H5ServiceService;
