'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-规则
 * 管理端规则控制器，全站仅维护一条规则记录
 */
class RuleController extends Controller {
  /**
   * @summary 管理端获取规则
   * @description 管理员获取完整规则数据（含状态）
   * @router get /api/admin/rules
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 规则详情
   */
  async adminGet() {
    const { ctx, service } = this;
    const data = await service.rule.adminGet();

    ctx.body = {
      code: 200,
      message: 'success',
      data,
    };
  }

  /**
   * @summary 创建规则图片
   * @description 创建规则图片数组；若已存在则覆盖更新
   * @router post /api/admin/rules
   * @request header string Authorization Bearer admin token
   * @request body RuleRequest *body 规则图片数组
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const body = await this._processImages();

    const data = await service.rule.create(body);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data,
    };
  }

  /**
   * @summary 更新规则图片
   * @description 更新规则图片数组；若不存在则自动创建
   * @router put /api/admin/rules
   * @request header string Authorization Bearer admin token
   * @request body RuleRequest *body 规则图片数组
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const body = await this._processImages();

    const data = await service.rule.update(body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data,
    };
  }

  /**
   * @summary 删除规则
   * @description 删除规则（软删除，将状态改为禁用）
   * @router delete /api/admin/rules
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    await service.rule.destroy();

    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }

  /**
   * 处理 multipart 上传的规则图片
   * 支持直接上传多个文件，也支持 JSON 传入 images 数组
   * @return {Object} 处理后的请求体
   */
  async _processImages() {
    const { ctx, service } = this;
    const body = { ...ctx.request.body };
    const files = ctx.request.files;

    if (files && files.length) {
      const urls = [];
      for (const file of files) {
        const result = await service.upload.image(file, 'rules');
        urls.push(result.url);
      }
      body.images = urls;
    }

    return body;
  }
}

module.exports = RuleController;
