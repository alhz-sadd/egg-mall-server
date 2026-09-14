'use strict';

const Service = require('egg').Service;

class H5ConfigService extends Service {
  /**
   * 分页获取配置列表 (后台使用)
   * @param query
   */
  async list(query = {}) {
    const { ctx } = this;
    const { config_type, title, status, page = 1, page_size = 10 } = query;
    const where = { is_deleted: 0 };

    if (config_type) where.config_type = config_type;
    if (status !== undefined && status !== '') where.status = status;
    if (title) where.title = { [ctx.app.Sequelize.Op.like]: `%${title}%` };

    const offset = (page - 1) * page_size;
    const { count, rows } = await ctx.model.SysH5Config.findAndCountAll({
      where,
      attributes: [ 'id', 'config_type', 'title', 'cover_image', 'content', 'extra', 'sort', 'status', 'remark', 'create_time', 'update_time' ],
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
   * 获取启用的配置列表 (H5公开接口)
   * 包含关联商品数据校验
   * @param configType
   */
  async getPublicList(configType) {
    const { ctx } = this;
    const items = await ctx.model.SysH5Config.findAll({
      where: {
        config_type: configType,
        status: 1,
        is_deleted: 0,
      },
      attributes: [ 'id', 'title', 'cover_image', 'content', 'extra', 'sort' ],
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
    });

    return items;
  }

  /**
   * 获取详情
   * @param id
   */
  async detail(id) {
    const { ctx } = this;
    const item = await ctx.model.SysH5Config.findOne({
      where: { id, is_deleted: 0 },
      include: [
        { model: ctx.model.SysUser, as: 'creator', attributes: [ 'nickname', 'username' ] },
        { model: ctx.model.SysUser, as: 'updater', attributes: [ 'nickname', 'username' ] },
      ],
    });
    ctx.assert(item, 404, '配置不存在');
    return item;
  }

  /**
   * 创建配置
   * @param payload
   * @param adminId
   */
  async create(payload, adminId) {
    const { ctx } = this;
    return await ctx.model.SysH5Config.create({
      ...payload,
      create_user_id: adminId,
      update_user_id: adminId,
      create_time: new Date(),
      update_time: new Date(),
    });
  }

  /**
   * 更新配置
   * @param id
   * @param payload
   * @param adminId
   */
  async update(id, payload, adminId) {
    const { ctx } = this;
    const item = await ctx.model.SysH5Config.findOne({ where: { id, is_deleted: 0 } });
    ctx.assert(item, 404, '配置不存在');

    return await item.update({
      ...payload,
      update_user_id: adminId,
      update_time: new Date(),
    });
  }

  /**
   * 删除配置
   * @param id
   */
  async destroy(id) {
    const { ctx } = this;
    const item = await ctx.model.SysH5Config.findOne({ where: { id, is_deleted: 0 } });
    ctx.assert(item, 404, '配置不存在');
    return await item.update({ is_deleted: 1 });
  }
}

module.exports = H5ConfigService;
