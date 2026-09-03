'use strict';

const Service = require('egg').Service;

/**
 * 收货地址服务层
 */
class AddressService extends Service {
  /**
   * 新增地址
   * @param {number} userId 用户ID
   * @param {Object} payload 地址信息
   * @return {Object} 创建的地址
   */
  async create(userId, payload) {
    const { ctx } = this;
    const data = { ...payload, user_id: userId };

    const transaction = await ctx.model.transaction();
    try {
      // 如果设置为默认地址，先把该用户的其他地址设为非默认
      if (data.is_default === 1) {
        await ctx.model.Address.update(
          { is_default: 0 },
          { where: { user_id: userId }, transaction },
        );
      }

      const address = await ctx.model.Address.create(data, { transaction });
      await transaction.commit();
      return address;
    } catch (err) {
      await transaction.rollback();
      ctx.throw(400, err.message);
    }
  }

  /**
   * 获取地址列表
   * @param {number} userId 用户ID
   * @return {Array} 地址列表
   */
  async list(userId) {
    const { ctx } = this;
    return await ctx.model.Address.findAll({
      where: { user_id: userId },
      order: [[ 'is_default', 'DESC' ], [ 'id', 'DESC' ]],
    });
  }

  /**
   * 获取地址详情
   * @param {number} id 地址ID
   * @param {number} userId 用户ID
   * @return {Object} 地址详情
   */
  async detail(id, userId) {
    const { ctx } = this;
    const address = await ctx.model.Address.findOne({
      where: { id, user_id: userId },
    });
    if (!address) {
      ctx.throw(404, '地址不存在');
    }
    return address;
  }

  /**
   * 更新地址
   * @param {number} id 地址ID
   * @param {number} userId 用户ID
   * @param {Object} payload 更新内容
   * @return {Object} 更新后的地址
   */
  async update(id, userId, payload) {
    const { ctx } = this;
    const address = await this.detail(id, userId);

    const transaction = await ctx.model.transaction();
    try {
      if (payload.is_default === 1) {
        await ctx.model.Address.update(
          { is_default: 0 },
          { where: { user_id: userId }, transaction },
        );
      }

      await address.update(payload, { transaction });
      await transaction.commit();
      return address;
    } catch (err) {
      await transaction.rollback();
      ctx.throw(400, err.message);
    }
  }

  /**
   * 删除地址
   * @param {number} id 地址ID
   * @param {number} userId 用户ID
   * @return {boolean} 是否删除成功
   */
  async remove(id, userId) {
    const { ctx } = this;
    const address = await this.detail(id, userId);

    // 简单校验：如果该地址被未完成的订单引用，则不允许删除
    const unfinishedOrder = await ctx.model.Order.findOne({
      where: { address_id: id, user_id: userId, status: { [ctx.model.Sequelize.Op.lt]: 3 } },
    });
    if (unfinishedOrder) {
      ctx.throw(400, '该地址存在未完成订单，暂不能删除');
    }

    await address.destroy();
    return true;
  }

  /**
   * 设置默认地址
   * @param {number} id 地址ID
   * @param {number} userId 用户ID
   * @return {Object} 更新后的地址
   */
  async setDefault(id, userId) {
    const { ctx } = this;
    const address = await this.detail(id, userId);

    const transaction = await ctx.model.transaction();
    try {
      await ctx.model.Address.update(
        { is_default: 0 },
        { where: { user_id: userId }, transaction },
      );
      await address.update({ is_default: 1 }, { transaction });
      await transaction.commit();
      return address;
    } catch (err) {
      await transaction.rollback();
      ctx.throw(400, err.message);
    }
  }
}

module.exports = AddressService;
