'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

class ShopH5BindingService extends Service {
  /**
   * 获取店铺H5绑定列表
   * @param query
   */
  async getList(query) {
    const { ctx, app } = this;
    const { page = 1, page_size = 10, shop_id, h5_url, status } = query;

    const where = { is_deleted: 0 };

    if (shop_id) {
      where.shop_id = shop_id;
    }

    if (h5_url) {
      where.h5_url = {
        [Op.like]: `%${h5_url}%`,
      };
    }

    if (status !== undefined && status !== '') {
      where.status = status;
    }

    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;

    const { count, rows } = await ctx.model.ShopH5Binding.findAndCountAll({
      where,
      limit,
      offset,
      order: [[ 'id', 'DESC' ]],
      include: [
        {
          model: ctx.model.Shop,
          as: 'shop',
          attributes: [ 'shop_name', 'shop_no' ],
          where: { is_deleted: 0 },
          required: false,
        },
      ],
    });

    return {
      list: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        page_size: limit,
      },
    };
  }

  /**
   * 获取详情
   * @param id
   */
  async getDetail(id) {
    const { ctx } = this;
    const item = await ctx.model.ShopH5Binding.findOne({
      where: { id, is_deleted: 0 },
      include: [
        {
          model: ctx.model.Shop,
          as: 'shop',
          attributes: [ 'shop_name', 'shop_no' ],
          where: { is_deleted: 0 },
          required: false,
        },
      ],
    });

    if (!item) {
      ctx.throw(404, '绑定记录不存在');
    }

    return item;
  }

  /**
   * 创建绑定
   * @param data
   */
  async create(data) {
    const { ctx } = this;
    const { shop_id, h5_url, status, remark } = data;

    // 检查店铺是否存在
    const shop = await ctx.model.Shop.findOne({
      where: { shop_id, is_deleted: 0 },
    });

    if (!shop) {
      ctx.throw(404, '关联的店铺不存在');
    }

    // 检查URL是否已经存在
    const exist = await ctx.model.ShopH5Binding.findOne({
      where: { h5_url, is_deleted: 0 },
    });

    if (exist) {
      ctx.throw(400, '该H5 URL已被绑定，请勿重复绑定');
    }

    const userId = ctx.state.user ? ctx.state.user.user_id : null;

    const result = await ctx.model.ShopH5Binding.create({
      shop_id,
      h5_url,
      status: status !== undefined ? status : 1,
      remark,
      create_user_id: userId,
      update_user_id: userId,
    });

    return result;
  }

  /**
   * 更新绑定
   * @param id
   * @param data
   */
  async update(id, data) {
    const { ctx } = this;
    const { shop_id, h5_url, status, remark } = data;

    const item = await ctx.model.ShopH5Binding.findOne({
      where: { id, is_deleted: 0 },
    });

    if (!item) {
      ctx.throw(404, '绑定记录不存在');
    }

    // 如果更新了URL，检查是否冲突
    if (h5_url && h5_url !== item.h5_url) {
      const exist = await ctx.model.ShopH5Binding.findOne({
        where: { h5_url, is_deleted: 0 },
      });

      if (exist) {
        ctx.throw(400, '该H5 URL已被其他记录绑定');
      }
    }

    // 如果更新了店铺，检查是否存在
    if (shop_id && shop_id !== item.shop_id) {
      const shop = await ctx.model.Shop.findOne({
        where: { shop_id, is_deleted: 0 },
      });

      if (!shop) {
        ctx.throw(404, '关联的店铺不存在');
      }
    }

    const userId = ctx.state.user ? ctx.state.user.user_id : null;

    const updateData = {
      update_user_id: userId,
    };

    if (shop_id !== undefined) updateData.shop_id = shop_id;
    if (h5_url !== undefined) updateData.h5_url = h5_url;
    if (status !== undefined) updateData.status = status;
    if (remark !== undefined) updateData.remark = remark;

    await item.update(updateData);

    return item;
  }

  /**
   * 删除绑定
   * @param id
   */
  async delete(id) {
    const { ctx } = this;
    const item = await ctx.model.ShopH5Binding.findOne({
      where: { id, is_deleted: 0 },
    });

    if (!item) {
      ctx.throw(404, '绑定记录不存在');
    }

    // 物理删除数据
    await item.destroy();

    return true;
  }
}

module.exports = ShopH5BindingService;
