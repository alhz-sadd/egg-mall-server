'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-文件上传
 * 管理端文件上传控制器
 */
class UploadController extends Controller {
  /**
   * @summary 上传本地图片
   * @description 上传单张图片文件到本地，返回可访问地址
   * @router post /api/admin/upload/image
   * @request header string Authorization Bearer admin token
   * @request formData file *file 图片文件
   * @request query string dir 存储目录：banners|products|tasks|rules|images（默认 images）
   * @response 200 ApiResponse 上传成功
   */
  async image() {
    const { ctx, service } = this;
    const files = ctx.request.files;

    if (!files || !files.length) {
      ctx.throw(422, '请上传图片文件');
    }

    const file = files[0];
    const dir = ctx.query.dir || 'images';

    try {
      const result = await service.upload.image(file, dir);

      ctx.body = {
        code: 200,
        message: '上传成功',
        data: result,
      };
    } catch (err) {
      // 出现异常时清理临时文件，避免磁盘堆积
      await ctx.cleanupRequestFiles();
      throw err;
    }
  }
}

module.exports = UploadController;
