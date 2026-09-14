'use strict';

const Service = require('egg').Service;

class PayChannelService extends Service {

  /**
   * 获取渠道列表
   * @param root0
   * @param root0.shop_id
   * @param root0.channel_type
   * @param root0.page
   * @param root0.page_size
   * @param root0.is_enable
   */
  async list({ shop_id, channel_type, page, page_size, is_enable }) {
    const { ctx } = this;
    const where = { shop_id };

    if (channel_type !== undefined && channel_type !== '') {
      where.channel_type = Number(channel_type);
    }

    if (is_enable !== undefined && is_enable !== '') {
      where.is_enable = Number(is_enable);
    }

    const limit = page_size ? Number(page_size) : 10;
    const offset = page ? (Number(page) - 1) * limit : 0;

    const result = await ctx.model.ShopPayChannel.findAndCountAll({
      where,
      limit,
      offset,
      order: [
        [ 'sort', 'ASC' ],
        [ 'id', 'DESC' ],
      ],
    });

    return {
      total: result.count,
      list: result.rows,
    };
  }

  /**
   * 新增渠道
   * @param payload
   */
  async create(payload) {
    const { ctx } = this;
    return await ctx.model.ShopPayChannel.create(payload);
  }

  /**
   * 根据ID查找渠道
   * @param id
   */
  async findById(id) {
    const { ctx } = this;
    return await ctx.model.ShopPayChannel.findByPk(id);
  }

  /**
   * 检查编码是否已存在
   * @param shop_id
   * @param channel_type
   * @param channel_code
   * @param excludeId
   */
  async checkCodeExist(shop_id, channel_type, channel_code, excludeId = null) {
    const { ctx } = this;
    const { Op } = this.app.Sequelize;
    const where = {
      shop_id,
      channel_type,
      channel_code,
    };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    return await ctx.model.ShopPayChannel.findOne({ where });
  }

  /**
   * 更新渠道
   * @param id
   * @param shop_id
   * @param payload
   */
  async update(id, shop_id, payload) {
    const { ctx } = this;
    const channel = await ctx.model.ShopPayChannel.findOne({
      where: { id, shop_id },
    });

    if (!channel) {
      ctx.throw(404, '渠道不存在或无权限修改');
    }

    // B端限制：如果是系统分配的默认渠道 (is_platform_default=1)，不可修改 channel_code 和 channel_name
    if (shop_id !== 0 && channel.is_platform_default === 1) {
      delete payload.channel_code;
      delete payload.channel_name;
      delete payload.channel_type;
    }

    return await channel.update(payload);
  }

  /**
   * 删除渠道
   * @param id
   * @param shop_id
   */
  async destroy(id, shop_id) {
    const { ctx } = this;
    const channel = await ctx.model.ShopPayChannel.findOne({
      where: { id, shop_id },
    });

    if (!channel) {
      ctx.throw(404, '渠道不存在或无权限删除');
    }

    if (shop_id !== 0 && channel.is_platform_default === 1) {
      ctx.throw(403, '系统默认分配的渠道不可删除，建议修改为禁用状态');
    }

    await channel.destroy();
    return true;
  }

  /**
   * 新建店铺时，自动复制 A 端的默认模板到该新店铺
   * @param new_shop_id
   * @param transaction
   */
  async copyTemplateToShop(new_shop_id, transaction) {
    const { ctx } = this;

    // 查询 A 端设置的全部模板 (shop_id=0)
    const templates = await ctx.model.ShopPayChannel.findAll({
      where: { shop_id: 0 },
      transaction,
    });

    if (templates.length === 0) return;

    // 组装新店铺的渠道数据
    const newChannels = templates.map(tpl => {
      return {
        shop_id: new_shop_id,
        channel_type: tpl.channel_type,
        channel_code: tpl.channel_code,
        channel_name: tpl.channel_name,
        is_platform_default: 1, // 标记为平台下发
        is_enable: tpl.is_enable,
        sort: tpl.sort,
        remark: tpl.remark,
      };
    });

    await ctx.model.ShopPayChannel.bulkCreate(newChannels, { transaction });
  }

  /**
   * A端手动给指定店铺绑定/更新默认充提渠道
   * @param shop_id
   */
  async syncTemplateToShop(shop_id) {
    const { ctx } = this;

    const t = await ctx.model.transaction();
    try {
      // 1. 检查店铺是否存在
      const shop = await ctx.model.Shop.findByPk(shop_id, { transaction: t });
      if (!shop) {
        ctx.throw(404, '店铺不存在');
      }

      // 2. 删除该店铺现有的平台下发渠道 (is_platform_default = 1)
      await ctx.model.ShopPayChannel.destroy({
        where: { shop_id, is_platform_default: 1 },
        transaction: t,
      });

      // 3. 复制最新的平台模板到该店铺
      await this.copyTemplateToShop(shop_id, t);

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

}

module.exports = PayChannelService;
