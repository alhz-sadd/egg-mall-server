'use strict';

const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

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

    ctx.assert(file, 422, 'common.please_upload_image');

    const ext = path.extname(file.filename || '').toLowerCase();
    const allowedExts = app.config.multipart.fileExtensions || [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
    ];

    if (!allowedExts.includes(ext)) {
      ctx.throw(422, 'upload.unsupported_image_format');
    }

    const maxSizeStr = app.config.multipart.fileSize || '10mb';
    // 简单处理 '10mb' 字符串转数字，如果是数字则直接使用
    const maxSize = typeof maxSizeStr === 'string' ? parseInt(maxSizeStr) * 1024 * 1024 : maxSizeStr;

    const fileSize = file.size || (await fs.promises.stat(file.filepath)).size;
    if (fileSize > maxSize) {
      ctx.throw(422, 'upload.image_size_exceed');
    }

    // 按日期分目录存储
    const dateDir = new Date().toISOString().slice(0, 10)
      .replace(/-/g, '');
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;

    // OSS 上的文件路径
    const objectName = `uploads/${dir}/${dateDir}/${filename}`;

    try {
      // 从 ENDPOINT 中提取 region，例如 s3.ap-southeast-1.amazonaws.com 提取 ap-southeast-1
      const endpoint = process.env.OSS_ENDPOINT || 's3.ap-southeast-1.amazonaws.com';
      const regionMatch = endpoint.match(/s3\.([a-z0-9-]+)\.amazonaws\.com/);
      const region = regionMatch ? regionMatch[1] : 'ap-southeast-1';

      // 初始化 AWS S3 客户端
      const s3Client = new S3Client({
        region: region,
        credentials: {
          accessKeyId: process.env.OSS_ACCESS_KEY_ID,
          secretAccessKey: process.env.OSS_ACCESS_KEY_SECRET,
        },
      });

      // 读取文件流
      const fileStream = fs.createReadStream(file.filepath);

      // 构建上传命令
      const command = new PutObjectCommand({
        Bucket: process.env.OSS_BUCKET,
        Key: objectName,
        Body: fileStream,
        ContentType: file.mimeType || 'image/jpeg', // 确保图片在浏览器中直接预览
      });

      // 上传文件至 AWS S3
      await s3Client.send(command);
    } catch (err) {
      ctx.logger.error('AWS S3 上传失败:', err);
      // 抛出具体的原始错误信息，方便直接在前端看到问题所在
      ctx.throw(500, err.message || 'upload.image_upload_failed');
    }

    // 构建 AWS S3 访问地址
    const endpoint = process.env.OSS_ENDPOINT || 's3.ap-southeast-1.amazonaws.com';
    const fileUrl = `https://${process.env.OSS_BUCKET}.${endpoint}/${objectName}`;

    return {
      url: fileUrl,
      path: fileUrl, // 返回绝对路径
      name: file.filename,
      size: fileSize,
    };
  }
}

module.exports = UploadService;
