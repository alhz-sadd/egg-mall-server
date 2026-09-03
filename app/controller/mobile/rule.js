'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-规则
 * 移动端规则控制器
 */
class RuleController extends Controller {
  /**
   * @summary 获取规则图片列表
   * @description 获取启用状态的规则图片数组
   * @router get /api/mobile/rules
   * @response 200 ApiResponse 规则图片数组
   */
  async index() {
    const { ctx, service } = this;
    const data = await service.rule.get();

    ctx.body = {
      code: 200,
      message: 'success',
      data,
    };
  }
}

module.exports = RuleController;
