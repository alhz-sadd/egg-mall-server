'use strict';

const Service = require('egg').Service;

/**
 * 购物车服务层
 */
class CartService extends Service {
  /**
   * 加入购物车
   * @param {number} userId 用户ID
   * @param {Object} payload 商品信息
   * @return {Object} 购物车记录
   */
  async add(userId, payload) {
    const { ctx } = this;
    const { product_id, quantity = 1 } = payload;

    const product = await ctx.model.Product.findByPk(product_id);
    if (!product || product.status !== 1) {
      ctx.throw(404, '商品不存在或已下架');
    }
    if (product.stock < quantity) {
      ctx.throw(400, '商品库存不足');
    }

    // 查询是否已存在记录
    let cart = await ctx.model.Cart.findOne({
      where: { user_id: userId, product_id },
    });

    if (cart) {
      // 合并数量
      const newQuantity = cart.quantity + Number(quantity);
      if (product.stock < newQuantity) {
        ctx.throw(400, '商品库存不足');
      }
      await cart.update({ quantity: newQuantity });
    } else {
      cart = await ctx.model.Cart.create({
        user_id: userId,
        product_id,
        quantity,
        selected: 1,
      });
    }

    return await this.findById(cart.id, userId);
  }

  /**
   * 查询购物车列表
   * @param {number} userId 用户ID
   * @return {Array} 购物车列表
   */
  async list(userId) {
    const { ctx } = this;
    return await ctx.model.Cart.findAll({
      where: { user_id: userId },
      include: [{
        model: ctx.model.Product,
        as: 'product',
        attributes: [ 'id', 'title', 'img', 'price', 'stock', 'status' ],
      }],
      order: [[ 'id', 'DESC' ]],
    });
  }

  /**
   * 根据ID查询购物车记录
   * @param {number} id 记录ID
   * @param {number} userId 用户ID
   * @return {Object} 购物车记录
   */
  async findById(id, userId) {
    const { ctx } = this;
    const cart = await ctx.model.Cart.findOne({
      where: { id, user_id: userId },
      include: [{
        model: ctx.model.Product,
        as: 'product',
        attributes: [ 'id', 'title', 'img', 'price', 'stock', 'status' ],
      }],
    });
    if (!cart) {
      ctx.throw(404, '购物车记录不存在');
    }
    return cart;
  }

  /**
   * 更新购物车数量
   * @param {number} id 记录ID
   * @param {number} userId 用户ID
   * @param {Object} payload 更新内容
   * @return {Object} 更新后的记录
   */
  async update(id, userId, payload) {
    const { ctx } = this;
    const { quantity, selected } = payload;

    const cart = await ctx.model.Cart.findOne({
      where: { id, user_id: userId },
    });
    if (!cart) {
      ctx.throw(404, '购物车记录不存在');
    }

    const updateData = {};
    if (quantity !== undefined) {
      const product = await ctx.model.Product.findByPk(cart.product_id);
      if (product && product.stock < quantity) {
        ctx.throw(400, '商品库存不足');
      }
      updateData.quantity = quantity;
    }
    if (selected !== undefined) {
      updateData.selected = selected;
    }

    await cart.update(updateData);
    return await this.findById(id, userId);
  }

  /**
   * 删除购物车记录
   * @param {number} id 记录ID
   * @param {number} userId 用户ID
   * @return {boolean} 是否删除成功
   */
  async remove(id, userId) {
    const { ctx } = this;
    const cart = await ctx.model.Cart.findOne({
      where: { id, user_id: userId },
    });
    if (!cart) {
      ctx.throw(404, '购物车记录不存在');
    }
    await cart.destroy();
    return true;
  }
}

module.exports = CartService;
