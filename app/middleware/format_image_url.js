'use strict';

/**
 * 统一格式化响应中的图片相对路径为绝对路径
 */
module.exports = () => {
  return async function formatImageUrl(ctx, next) {
    await next();

    // 仅拦截 JSON 类型的响应对象，跳过 Buffer 和 Stream (如文件下载)
    if (
      ctx.body &&
      typeof ctx.body === 'object' &&
      !Buffer.isBuffer(ctx.body) &&
      typeof ctx.body.pipe !== 'function'
    ) {
      const baseUrl = ctx.app.config.appBaseUrl;
      if (!baseUrl) return;

      const traverse = (obj) => {
        for (const key in obj) {
          const val = obj[key];
          if (typeof val === 'string') {
            if (val.startsWith('/public/')) {
              // 处理直接的相对路径字段 (如 image: "/public/uploads/xxx.png")
              obj[key] = baseUrl + val;
            } else if (val.includes('/public/')) {
              // 处理富文本或嵌套标签中的相对路径
              obj[key] = val.replace(/(src|href)=["'](\/public\/[^"']+)["']/g, `$1="${baseUrl}$2"`);
            }
          } else if (val !== null && typeof val === 'object') {
            traverse(val);
          }
        }
      };

      try {
        // 转为纯 JS 对象，避免破坏 Sequelize 实例或触发 getter
        const cleanBody = JSON.parse(JSON.stringify(ctx.body));
        traverse(cleanBody);
        ctx.body = cleanBody;
      } catch (err) {
        ctx.logger.error('[format_image_url middleware] parse body error:', err);
      }
    }
  };
};