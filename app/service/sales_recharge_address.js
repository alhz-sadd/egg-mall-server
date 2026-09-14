'use strict';

const Service = require('egg').Service;

class SalesRechargeAddressService extends Service {

  /**
   * 获取业务员充值地址列表
   * @param root0
   * @param root0.user_id
   * @param root0.page
   * @param root0.page_size
   * @param root0.status
   */
  async list({ user_id, page = 1, page_size = 10, status }) {
    const { ctx } = this;
    const where = { user_id };

    if (status !== undefined && status !== '') {
      where.status = Number(status);
    }

    const limit = Number(page_size);
    const offset = (Number(page) - 1) * limit;

    const { count, rows } = await ctx.model.SalesRechargeAddress.findAndCountAll({
      where,
      limit,
      offset,
      order: [
        [ 'is_default', 'DESC' ], // 默认地址排在最前
        [ 'id', 'DESC' ],
      ],
    });

    return {
      total: count,
      list: rows,
    };
  }

  /**
   * 新增业务员地址
   * @param payload
   */
  async create(payload) {
    const { ctx } = this;
    const t = await ctx.model.transaction();
    try {
      // 检查是否是该业务员的第一个地址，如果是，强制设为默认
      const existCount = await ctx.model.SalesRechargeAddress.count({
        where: { user_id: payload.user_id },
        transaction: t,
      });

      if (existCount === 0) {
        payload.is_default = 1;
      }

      // 如果新增的地址是默认地址，需将其他地址设为非默认
      if (payload.is_default === 1 && existCount > 0) {
        await ctx.model.SalesRechargeAddress.update(
          { is_default: 0 },
          { where: { user_id: payload.user_id }, transaction: t },
        );
      }

      const result = await ctx.model.SalesRechargeAddress.create(payload, { transaction: t });
      await t.commit();
      return result;
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  /**
   * 更新地址
   * @param id
   * @param user_id
   * @param payload
   */
  async update(id, user_id, payload) {
    const { ctx } = this;

    const address = await ctx.model.SalesRechargeAddress.findOne({
      where: { id, user_id },
    });

    if (!address) {
      ctx.throw(404, '地址不存在或无权限修改');
    }

    const t = await ctx.model.transaction();
    try {
      // 如果将此地址设为默认，需取消其他默认地址
      if (payload.is_default === 1 && address.is_default === 0) {
        await ctx.model.SalesRechargeAddress.update(
          { is_default: 0 },
          { where: { user_id, id: { [ctx.app.Sequelize.Op.ne]: id } }, transaction: t },
        );
      }

      // 如果取消默认，且没有其他默认地址，不允许取消
      if (payload.is_default === 0 && address.is_default === 1) {
        ctx.throw(400, '必须保留一个默认地址');
      }

      const result = await address.update(payload, { transaction: t });
      await t.commit();
      return result;
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  /**
   * 删除地址
   * @param id
   * @param user_id
   */
  async destroy(id, user_id) {
    const { ctx } = this;
    const address = await ctx.model.SalesRechargeAddress.findOne({
      where: { id, user_id },
    });

    if (!address) {
      ctx.throw(404, '地址不存在或无权限删除');
    }

    if (address.is_default === 1) {
      ctx.throw(400, '不能直接删除默认地址，请先将其他地址设为默认');
    }

    await address.destroy();
    return true;
  }
}

module.exports = SalesRechargeAddressService;
