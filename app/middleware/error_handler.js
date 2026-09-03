'use strict';

/**
 * 全局错误处理中间件
 * 统一返回 { code, message, data } 格式的响应
 * @return {Function} 中间件函数
 */
module.exports = () => {
  return async function errorHandler(ctx, next) {
    try {
      await next();
    } catch (err) {
      // 记录错误日志
      ctx.app.emit('error', err, ctx);

      // 默认错误状态码和响应码
      let status = err.status || 500;
      let code = err.code || status;
      let message = err.message || '服务器内部错误';

      // 处理参数校验类错误（如 egg-validate 抛出的错误）
      if (err.name === 'ValidationError') {
        status = 422;
        code = 422;
        // 如果想让多语言插件生效，可以把这部分提取出来，这里为了简化先原样返回
        message = `参数校验失败：${err.message}`;
      }

      // 处理 JWT 认证错误
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        status = 401;
        code = 401;
        message = err.name === 'TokenExpiredError' ? '登录已过期，请重新登录' : '登录凭证无效';
      }

      // 处理 Sequelize 唯一约束冲突
      if (err.name === 'SequelizeUniqueConstraintError') {
        status = 409;
        code = 409;
        message = '数据已存在，请勿重复提交';
      }

      // 进行多语言翻译 (移动端和管理端都可以统一处理)
      if (ctx.__) {
        // 先尝试完全匹配翻译
        let translated = ctx.__(message);
        // 处理带前缀的参数校验错误
        if (translated === message && message.startsWith('参数校验失败：')) {
          const detail = message.replace('参数校验失败：', '');
          translated = ctx.__('param_error', { msg: detail });
        }
        message = translated;
      }

      // 开发环境可返回详细堆栈
      const detailed = ctx.app.config.errorHandler && ctx.app.config.errorHandler.detailed;
      const body = {
        code,
        message,
        data: null,
      };
      if (detailed && status === 500) {
        body.stack = err.stack;
      }

      ctx.status = status;
      ctx.body = body;
    }
  };
};
