'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-文件上传
 * 移动端文件上传控制器
 */
class UploadController extends Controller {
  /**
   * @summary 上传本地图片
   * @description 上传单张图片文件到本地，返回可访问地址
   * @router post /api/mobile/upload/image
   * @request header string Authorization Bearer token
   * @request formData file *file 图片文件
   * @request query string dir 存储目录：banners|products|tasks|rules|images（默认 images）
   * @response 200 ApiResponse 上传成功
   */
  async image() {
    const { ctx, service } = this;
    const files = ctx.request.files;

    if (!files || !files.length) {
      ctx.throw(422, ctx.__('common.please_upload_image'));
    }

    const file = files[0];
    const dir = ctx.query.dir || 'images';

    try {
      const result = await service.upload.image(file, dir);

      ctx.body = {
        code: 200,
        message: ctx.__('common.upload_success'),
        data: result,
      };
    } catch (err) {
      throw err;
    } finally {
      // 无论成功还是失败，都清理临时文件，避免磁盘堆积
      await ctx.cleanupRequestFiles();
    }
  }
}

module.exports = UploadController;
