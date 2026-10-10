'use strict';

const Service = require('egg').Service;

class H5ServiceService extends Service {
  /**
   * 分页获取客服列表 (后台)
   * @param query
   */
  async list(query = {}) {
    const { ctx } = this;
    const { service_name, status, shop_id, page = 1, page_size = 10 } = query;
    const where = { is_deleted: 0 };

    if (service_name) where.service_name = { [ctx.app.Sequelize.Op.like]: `%${service_name}%` };
    if (status !== undefined && status !== '') where.status = status;
    if (shop_id !== undefined && shop_id !== '') where.shop_id = shop_id;

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
   * @param shopId
   */
  async getPublicList(shopId = 0) {
    const { ctx } = this;
    return await ctx.model.SysH5Service.findAll({
      where: {
        shop_id: shopId,
        status: 1,
        is_deleted: 0,
      },
      attributes: [ 'id', 'shop_id', 'service_name', 'avatar', 'contact_type', 'contact_value', 'jump_url', 'sort' ],
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

    const dataToSave = {
      ...payload,
      create_user_id: adminId,
      update_user_id: adminId,
      create_time: new Date(),
      update_time: new Date(),
    };

    return await ctx.model.SysH5Service.create(dataToSave);
  }

  /**
   * 更新客服
   * @param id
   * @param payload
   * @param adminId
   * @param shopId
   */
  async update(id, payload, adminId, shopId) {
    const { ctx } = this;
    const where = { id, is_deleted: 0 };
    if (shopId !== undefined) {
      where.shop_id = shopId;
    }
    const item = await ctx.model.SysH5Service.findOne({ where });
    ctx.assert(item, 404, '客服配置不存在或无权操作');

    const updateData = { ...payload, update_user_id: adminId, update_time: new Date() };

    return await item.update(updateData);
  }

  /**
   * 软删除客服
   * @param id
   * @param shopId
   */
  async destroy(id, shopId) {
    const { ctx } = this;
    const where = { id, is_deleted: 0 };
    if (shopId !== undefined) {
      where.shop_id = shopId;
    }
    const item = await ctx.model.SysH5Service.findOne({ where });
    ctx.assert(item, 404, '客服配置不存在');
    // 物理删除
    return await item.destroy();
  }

  /**
   * 导入全局客服模板到指定店铺
   * @param {number} shopId 店铺ID
   * @param {number} adminId 操作人ID
   */
  async importGlobalServices(shopId, adminId) {
    const { ctx } = this;

    // 1. 获取全局客服 (shop_id = 0)
    const globalServices = await ctx.model.SysH5Service.findAll({
      where: {
        shop_id: 0,
        is_deleted: 0,
      },
      raw: true,
    });

    if (!globalServices || globalServices.length === 0) {
      return false; // 无数据不报错，直接返回
    }

    // 2. 清除该店铺原有客服 (物理删除)
    await ctx.model.SysH5Service.destroy({
      where: {
        shop_id: shopId,
      },
    });

    // 3. 构建新的店铺客服数据
    const newServices = globalServices.map(item => {
      return {
        shop_id: shopId,
        service_name: item.service_name,
        avatar: item.avatar,
        contact_type: item.contact_type,
        contact_value: item.contact_value,
        jump_url: item.jump_url,
        sort: item.sort,
        status: item.status,
        remark: item.remark,
        create_user_id: adminId,
        update_user_id: adminId,
        create_time: new Date(),
        update_time: new Date(),
        is_deleted: 0,
      };
    });

    // 4. 批量插入
    await ctx.model.SysH5Service.bulkCreate(newServices);

    return true;
  }
}

module.exports = H5ServiceService;
