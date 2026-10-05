'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-收货地址
 * 移动端收货地址控制器
 */
class AddressController extends Controller {
  /**
   * @summary 获取地址列表
   * @description 获取当前登录用户的收货地址列表
   * @router get /api/mobile/addresses
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 地址列表
   */
  async index() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;

    const list = await service.address.list(userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: list,
    };
  }

  /**
   * @summary 新增地址
   * @description 为当前登录用户新增收货地址
   * @router post /api/mobile/addresses
   * @request header string Authorization Bearer token
   * @request body AddressRequest *body 地址信息
   * @response 200 ApiResponse 新增成功
   */
  async create() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { receiver, phone, province, city, district, detail, is_default } = ctx.request.body;

    ctx.assert(receiver, 422, ctx.__('address.consignee_empty'));
    ctx.assert(phone, 422, ctx.__('user.phone_empty'));
    ctx.assert(province, 422, ctx.__('address.province_empty'));
    ctx.assert(city, 422, ctx.__('address.city_empty'));
    ctx.assert(district, 422, ctx.__('address.district_empty'));
    ctx.assert(detail, 422, ctx.__('address.detail_address_empty'));

    const address = await service.address.create(userId, {
      receiver, phone, province, city, district, detail, is_default,
    });

    ctx.body = {
      code: 200,
      message: ctx.__('address.address_add_success'),
      data: address,
    };
  }

  /**
   * @summary 获取地址详情
   * @description 根据地址ID获取详情
   * @router get /api/mobile/addresses/:id
   * @request header string Authorization Bearer token
   * @request path integer *id 地址ID
   * @response 200 ApiResponse 地址详情
   */
  async show() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { id } = ctx.params;

    const address = await service.address.detail(id, userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: address,
    };
  }

  /**
   * @summary 更新地址
   * @description 根据地址ID更新信息
   * @router put /api/mobile/addresses/:id
   * @request header string Authorization Bearer token
   * @request path integer *id 地址ID
   * @request body AddressRequest *body 地址信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { id } = ctx.params;

    const address = await service.address.update(id, userId, ctx.request.body);

    ctx.body = {
      code: 200,
      message: ctx.__('address.address_update_success'),
      data: address,
    };
  }

  /**
   * @summary 删除地址
   * @description 根据地址ID删除收货地址
   * @router delete /api/mobile/addresses/:id
   * @request header string Authorization Bearer token
   * @request path integer *id 地址ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { id } = ctx.params;

    await service.address.remove(id, userId);

    ctx.body = {
      code: 200,
      message: ctx.__('address.address_delete_success'),
      data: null,
    };
  }

  /**
   * @summary 设置默认地址
   * @description 将指定地址设为当前用户的默认地址
   * @router put /api/mobile/addresses/:id/default
   * @request header string Authorization Bearer token
   * @request path integer *id 地址ID
   * @response 200 ApiResponse 设置成功
   */
  async setDefault() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;
    const { id } = ctx.params;

    const address = await service.address.setDefault(id, userId);

    ctx.body = {
      code: 200,
      message: ctx.__('address.default_address_set_success'),
      data: address,
    };
  }
}

module.exports = AddressController;
