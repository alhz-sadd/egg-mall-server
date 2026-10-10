'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

class ShopH5BindingService extends Service {
  /**
   * 获取店铺绑定的域名
   * @param {number} shop_id
   */
  async getShopBindings(shop_id) {
    const { ctx } = this;
    const rows = await ctx.model.ShopH5Binding.findAll({
      where: { shop_id },
      attributes: [ 'h5_url', 'type' ],
    });

    const h5_domains = rows.filter(r => r.type === 'h5').map(r => r.h5_url).join('\n');
    const admin_domains = rows.filter(r => r.type === 'admin').map(r => r.h5_url).join('\n');

    return {
      h5_domains,
      admin_domains,
    };
  }

  /**
   * 保存店铺绑定域名
   * @param {Object} data
   */
  async saveShopBindings(data) {
    const { ctx } = this;
    const { shop_id, h5_domains, admin_domains } = data;

    // 检查店铺是否存在
    const shop = await ctx.model.Shop.findOne({
      where: { shop_id },
    });

    if (!shop) {
      ctx.throw(404, '关联的店铺不存在');
    }

    // 解析域名
    const parseDomains = str => {
      if (!str) return [];
      return str.split('\n').map(d => d.trim()).filter(d => d);
    };

    const h5List = parseDomains(h5_domains);
    const adminList = parseDomains(admin_domains);
    const allUrls = [ ...h5List, ...adminList ];

    // 检查是否有域名被其他店铺占用
    if (allUrls.length > 0) {
      const exists = await ctx.model.ShopH5Binding.findAll({
        where: {
          h5_url: { [Op.in]: allUrls },
          shop_id: { [Op.ne]: shop_id },
        },
      });
      if (exists && exists.length > 0) {
        ctx.throw(400, `域名 ${exists[0].h5_url} 已被其他店铺(ID: ${exists[0].shop_id})占用`);
      }
    }

    const userId = ctx.state.user ? ctx.state.user.user_id : null;

    // 开启事务处理
    const transaction = await ctx.model.transaction();
    try {
      // 1. 获取当前店铺所有绑定的旧数据
      const oldBindings = await ctx.model.ShopH5Binding.findAll({
        where: { shop_id },
        transaction,
      });

      if (oldBindings.length > 0) {
        // 提取旧记录的ID进行硬删除（物理删除），让域名彻底释放
        const oldIds = oldBindings.map(item => item.id);
        await ctx.model.ShopH5Binding.destroy({
          where: { id: { [Op.in]: oldIds } },
          force: true, // 强制物理删除
          transaction,
        });
      }

      // 2. 插入新的绑定
      const records = [];
      for (const url of h5List) {
        records.push({
          shop_id,
          h5_url: url,
          type: 'h5',
          status: 1,
          create_user_id: userId,
          update_user_id: userId,
        });
      }
      for (const url of adminList) {
        records.push({
          shop_id,
          h5_url: url,
          type: 'admin',
          status: 1,
          create_user_id: userId,
          update_user_id: userId,
        });
      }

      if (records.length > 0) {
        await ctx.model.ShopH5Binding.bulkCreate(records, { transaction });
      }

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = ShopH5BindingService;
