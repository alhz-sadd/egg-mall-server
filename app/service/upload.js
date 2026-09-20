'use strict';

const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');

/**
 * 文件上传服务层
 */
class UploadService extends Service {
  /**
   * 上传图片并保存到本地 public/uploads 目录
   * @param {Object} file Egg 解析后的文件对象
   * @param {string} dir 业务目录，例如 banners、products、tasks
   * @return {Object} 图片访问地址及元信息
   */
  async image(file, dir = 'images') {
    const { ctx, app } = this;

    ctx.assert(file, 422, '请上传图片文件');

    const ext = path.extname(file.filename || '').toLowerCase();
    const allowedExts = app.config.multipart.fileExtensions || [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
    ];

    if (!allowedExts.includes(ext)) {
      ctx.throw(422, `不支持的图片格式，仅允许：${allowedExts.join('、')}`);
    }

    const maxSizeStr = app.config.multipart.fileSize || '10mb';
    // 简单处理 '10mb' 字符串转数字，如果是数字则直接使用
    const maxSize = typeof maxSizeStr === 'string' ? parseInt(maxSizeStr) * 1024 * 1024 : maxSizeStr;
    
    const fileSize = file.size || (await fs.promises.stat(file.filepath)).size;
    if (fileSize > maxSize) {
      ctx.throw(422, `图片大小不能超过 ${Math.floor(maxSize / 1024 / 1024)}MB`);
    }

    // 按日期分目录存储
    const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    
    // OSS 上的文件路径
    const objectName = `uploads/${dir}/${dateDir}/${filename}`;

    let result;
    try {
      // 上传文件至 OSS
      result = await ctx.oss.put(objectName, file.filepath);
    } catch (err) {
      ctx.logger.error('OSS 上传失败:', err);
      // 将具体的错误信息抛出，方便在线上环境排查 500 错误的原因
      ctx.throw(500, `图片上传失败: ${err.message}`);
    }

    return {
      url: result.url,
      path: result.url, // OSS 返回绝对路径，如果需要存储相对路径可以使用 '/' + result.name
      name: file.filename,
      size: fileSize,
    };
  }
}

module.exports = UploadService;
