'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-轮播图
 * 移动端轮播图控制器
 */
class BannerController extends Controller {
  /**
   * @summary 获取轮播图列表
   * @description 移动端轮播图列表，仅返回启用状态（status=1）
   * @router get /api/mobile/banners
   * @response 200 ApiResponse 轮播图列表
   */
  async index() {
    const { ctx, service } = this;
    const result = await service.banner.list();

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取轮播图详情
   * @description 根据轮播图ID获取详情
   * @router get /api/mobile/banners/:id
   * @request path integer *id 轮播图ID
   * @response 200 ApiResponse 轮播图详情
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    const banner = await service.banner.detail(id);

    ctx.body = {
      code: 200,
      message: 'success',
      data: banner,
    };
  }
}

module.exports = BannerController;
