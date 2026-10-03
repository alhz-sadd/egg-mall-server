'use strict';

const Service = require('egg').Service;

/**
 * 轮播图模板服务层
 */
class BannerService extends Service {
  /**
   * 获取轮播图模板列表 (C端)
   * @param {Number} shopId 店铺ID，默认为0
   * @return {Array} 轮播图数组 (解析后的banners)
   */
  async list(shopId = 0) {
    const { ctx } = this;
    const template = await ctx.model.SysH5Config.findOne({
      where: { config_type: 1, status: 1, shop_id: shopId, is_deleted: 0 },
      order: [[ 'id', 'DESC' ]],
    });

    if (!template || !template.content) {
      return [];
    }

    try {
      return JSON.parse(template.content);
    } catch (e) {
      return [];
    }
  }

  /**
   * 管理端获取轮播图模板列表
   * @param {Number} shopId 店铺ID
   * @param {Object} query 查询参数
   */
  async adminList(shopId = 0, query = {}) {
    const { ctx } = this;
    const { page = 1, page_size = 10, keyword } = query;
    const where = { config_type: 1, shop_id: shopId, is_deleted: 0 };

    if (keyword) {
      where.title = { [ctx.app.Sequelize.Op.like]: `%${keyword}%` };
    }

    const offset = (page - 1) * page_size;
    const { count, rows } = await ctx.model.SysH5Config.findAndCountAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
      offset,
      limit: Number(page_size),
    });

    const list = rows.map(item => {
      const data = item.toJSON();
      try {
        data.banners = JSON.parse(data.content || '[]');
      } catch (e) {
        data.banners = [];
      }
      return data;
    });

    return {
      list,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
      },
    };
  }

  /**
   * 创建/更新轮播图模板
   * @param {Object} payload 模板数据
   * @param {Number} shopId 店铺ID，默认0（全局）
   */
  async create(payload, shopId = 0) {
    const { ctx } = this;
    const title = payload.title || '未命名模板';
    const sort = payload.sort !== undefined ? Number(payload.sort) : 0;
    const banners = Array.isArray(payload.banners) ? payload.banners : [];
    const content = JSON.stringify(banners);

    const existList = await ctx.model.SysH5Config.findAll({
      where: { config_type: 1, shop_id: shopId, is_deleted: 0 },
    });

    let currentTemplate = null;
    const id = payload.id;

    if (id) {
      currentTemplate = existList.find(item => item.id === Number(id));
      if (!currentTemplate) {
        ctx.throw(404, '要编辑的模板不存在');
      }
    }

    const targetStatus = payload.status !== undefined ? Number(payload.status) : 1;

    // 如果是店铺模板，只能有一条启用；全局模板可以有多条启用
    if (targetStatus === 1 && shopId !== 0) {
      for (const t of existList) {
        if (t.status === 1 && (!currentTemplate || t.id !== currentTemplate.id)) {
          await t.update({ status: 0 });
        }
      }
    }

    if (currentTemplate) {
      await currentTemplate.update({
        title,
        sort,
        content,
        status: targetStatus,
      });
    } else {
      currentTemplate = await ctx.model.SysH5Config.create({
        config_type: 1,
        title,
        sort,
        content,
        status: targetStatus,
        shop_id: shopId,
      });
    }

    return currentTemplate;
  }

  /**
   * 单独更新模板状态
   * @param {Number} id 模板ID
   * @param {Number} status 状态
   * @param {Number} shopId 店铺ID
   */
  async updateStatus(id, status, shopId = 0) {
    const { ctx } = this;
    const targetStatus = Number(status);

    const template = await ctx.model.SysH5Config.findOne({
      where: { id, config_type: 1, shop_id: shopId, is_deleted: 0 },
    });

    if (!template) {
      ctx.throw(404, '要操作的模板不存在');
    }

    if (targetStatus === 1 && shopId !== 0) {
      await ctx.model.SysH5Config.update(
        { status: 0 },
        { where: { config_type: 1, shop_id: shopId, is_deleted: 0 } },
      );
    }

    await template.update({ status: targetStatus });
    return { id, status: targetStatus };
  }

  /**
   * 删除模板
   * @param {Number} id 模板ID
   * @param {Number} shopId 店铺ID
   */
  async destroy(id, shopId = 0) {
    const { ctx } = this;
    const template = await ctx.model.SysH5Config.findOne({
      where: { id, config_type: 1, shop_id: shopId, is_deleted: 0 },
    });

    if (!template) {
      ctx.throw(404, '模板不存在');
    }

    await template.destroy();
  }

  /**
   * 绑定平台模板到店铺
   * @param {Number} templateId 平台模板ID
   * @param {Number} shopId 店铺ID
   */
  async bindTemplate(templateId, shopId) {
    const { ctx } = this;
    if (!shopId) {
      ctx.throw(400, '必须提供 shopId');
    }

    const template = await ctx.model.SysH5Config.findOne({
      where: { id: templateId, config_type: 1, shop_id: 0, is_deleted: 0 },
    });

    if (!template) {
      ctx.throw(404, '指定的平台模板不存在');
    }

    await ctx.model.SysH5Config.update(
      { status: 0 },
      { where: { config_type: 1, shop_id: shopId, status: 1, is_deleted: 0 } },
    );

    const newTemplate = await ctx.model.SysH5Config.create({
      config_type: 1,
      title: template.title,
      sort: template.sort,
      content: template.content,
      status: 1,
      shop_id: shopId,
    });

    return newTemplate;
  }
}

module.exports = BannerService;
