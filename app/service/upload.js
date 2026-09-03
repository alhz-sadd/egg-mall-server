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

    const maxSize = app.config.multipart.fileSize || 10 * 1024 * 1024;
    const fileSize = file.size || (await fs.promises.stat(file.filepath)).size;
    if (fileSize > maxSize) {
      ctx.throw(422, `图片大小不能超过 ${Math.floor(maxSize / 1024 / 1024)}MB`);
    }

    // 按日期分目录存储，避免单目录文件过多
    const dateDir = new Date().toISOString().slice(0, 10)
      .replace(/-/g, '');
    const uploadDir = path.join(app.baseDir, 'app', 'public', 'uploads', dir, dateDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const targetPath = path.join(uploadDir, filename);

    await fs.promises.rename(file.filepath, targetPath);

    const relativePath = `/public/uploads/${dir}/${dateDir}/${filename}`;
    const fullUrl = `${ctx.origin}${relativePath}`;

    return {
      url: fullUrl,
      path: relativePath,
      name: file.filename,
      size: fileSize,
    };
  }
}

module.exports = UploadService;
