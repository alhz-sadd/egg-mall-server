'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-购物车
 * 移动端购物车控制器
 */
class CartController extends Controller {
  /**
   * @summary 获取购物车列表
   * @description 获取当前登录用户的购物车列表
   * @router get /api/mobile/carts
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 购物车列表
   */
  async index() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;

    const list = await service.cart.list(userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: list,
    };
  }

  /**
   * @summary 加入购物车
   * @description 将商品加入当前用户的购物车
   * @router post /api/mobile/carts
   * @request header string Authorization Bearer token
   * @request body CartRequest *body 购物车信息
   * @response 200 ApiResponse 加入成功
   */
  async create() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { product_id, quantity } = ctx.request.body;

    ctx.assert(product_id, 422, '商品ID不能为空');
    ctx.assert(quantity && quantity > 0, 422, '商品数量必须大于0');

    const cart = await service.cart.add(userId, { product_id, quantity });

    ctx.body = {
      code: 200,
      message: '加入购物车成功',
      data: cart,
    };
  }

  /**
   * @summary 更新购物车
   * @description 根据购物车ID更新数量或选中状态
   * @router put /api/mobile/carts/:id
   * @request header string Authorization Bearer token
   * @request path integer *id 购物车记录ID
   * @request body CartUpdateRequest *body 更新信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { id } = ctx.params;
    const { quantity, selected } = ctx.request.body;

    const cart = await service.cart.update(id, userId, { quantity, selected });

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: cart,
    };
  }

  /**
   * @summary 删除购物车记录
   * @description 根据购物车ID删除记录
   * @router delete /api/mobile/carts/:id
   * @request header string Authorization Bearer token
   * @request path integer *id 购物车记录ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { id } = ctx.params;

    await service.cart.remove(id, userId);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = CartController;
