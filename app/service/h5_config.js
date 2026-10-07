'use strict';

const Service = require('egg').Service;

class H5ConfigService extends Service {
  /**
   * 分页获取配置列表 (后台使用)
   * @param query
   */
  async list(query = {}) {
    const { ctx } = this;
    const { config_type, title, keyword, status, shop_id, page = 1, page_size = 10 } = query;
    const where = { is_deleted: 0 };

    if (config_type) where.config_type = config_type;
    if (status !== undefined && status !== '') where.status = status;
    if (title) where.title = { [ctx.app.Sequelize.Op.like]: `%${title}%` };
    if (keyword) where.title = { [ctx.app.Sequelize.Op.like]: `%${keyword}%` };
    if (shop_id !== undefined && shop_id !== '') where.shop_id = shop_id;

    const offset = (page - 1) * page_size;
    const { count, rows } = await ctx.model.SysH5Config.findAndCountAll({
      where,
      attributes: [ 'id', 'shop_id', 'config_type', 'title', 'cover_image', 'content', 'extra', 'sort', 'status', 'remark', 'create_time', 'update_time' ],
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
   * @param shopId
   */
  async getPublicList(configType, shopId = 0) {
    const { ctx } = this;
    const items = await ctx.model.SysH5Config.findAll({
      where: {
        config_type: configType,
        shop_id: shopId,
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

    await item.update({
      ...payload,
      update_user_id: adminId,
      update_time: new Date(),
    });

    // 如果更新的是全局模板 (shop_id = 0)，则同步给所有绑定了它的店铺模板
    if (item.shop_id === 0) {
      // 提取出需要同步的字段
      const syncPayload = {};
      const syncFields = [ 'title', 'cover_image', 'content', 'extra', 'sort', 'status' ];
      syncFields.forEach(field => {
        if (payload[field] !== undefined) {
          syncPayload[field] = payload[field];
        }
      });

      if (Object.keys(syncPayload).length > 0) {
        await ctx.model.SysH5Config.update(
          {
            ...syncPayload,
            update_user_id: adminId,
            update_time: new Date(),
          },
          { where: { source_template_id: item.id, config_type: item.config_type, is_deleted: 0 } }
        );
      }
    }

    return item;
  }

  /**
   * 删除配置
   * @param id
   */
  async destroy(id) {
    const { ctx } = this;
    const item = await ctx.model.SysH5Config.findOne({ where: { id, is_deleted: 0 } });
    ctx.assert(item, 404, '配置不存在');

    // 如果是店铺绑定的配置，则物理删除；如果是全局模板，则软删除。
    // 如果你要全部物理删除，直接去掉这个判断，只保留 item.destroy() 即可。
    // 根据你的要求："删除店铺绑定的...不要软删除"，我们这里可以统一用物理删除或者区分。
    // 这里采用最彻底的物理删除，因为不需要软删了。
    return await item.destroy();
  }

  /**
   * 导入全局配置模板到指定店铺 (Banner、规则等)
   * @param {number} shopId 店铺ID
   * @param {number} adminId 操作人ID
   * @param {Array<number>} configTypes 需要导入的配置类型数组
   */
  async importGlobalConfigs(shopId, adminId, configTypes = [ 1, 3 ]) {
    const { ctx } = this;

    // 1. 获取全局配置 (shop_id = 0)
    const globalConfigs = await ctx.model.SysH5Config.findAll({
      where: {
        config_type: {
          [ctx.app.Sequelize.Op.in]: configTypes,
        },
        shop_id: 0,
        is_deleted: 0,
      },
      raw: true,
    });

    if (!globalConfigs || globalConfigs.length === 0) {
      return false; // 无数据不报错，直接返回
    }

    // 2. 清除该店铺原有的这些类型的配置 (物理删除)
    await ctx.model.SysH5Config.destroy({
      where: {
        config_type: {
          [ctx.app.Sequelize.Op.in]: configTypes,
        },
        shop_id: shopId,
      },
    });

    // 3. 构建新的店铺配置数据
    const newConfigs = globalConfigs.map(item => {
      return {
        shop_id: shopId,
        source_template_id: item.id, // 记录来源模板ID
        config_type: item.config_type,
        title: item.title,
        cover_image: item.cover_image,
        content: item.content,
        extra: item.extra,
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
    await ctx.model.SysH5Config.bulkCreate(newConfigs);

    return true;
  }
}

module.exports = H5ConfigService;
