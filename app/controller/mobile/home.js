'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-健康检查
 * 移动端首页/健康检查控制器
 */
class HomeController extends Controller {
  /**
   * @summary 服务健康检查
   * @description 返回服务运行状态及版本信息
   * @router get /
   * @response 200 ApiResponse 服务运行正常
   */
  async index() {
    const { ctx } = this;
    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        name: '商城后端服务',
        env: ctx.app.config.env,
        version: '1.0.0',
      },
    };
  }
}

module.exports = HomeController;
