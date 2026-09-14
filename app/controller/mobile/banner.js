'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-轮播图
 * 移动端轮播图控制器
 */
class BannerController extends Controller {
  /**
   * @summary 获取轮播图列表
   * @description 移动端首页轮播图，仅返回状态为启用的轮播图
   * @router get /api/mobile/public/banners
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
}

module.exports = BannerController;
