'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-任务库
 * 移动端任务控制器
 */
class TaskController extends Controller {
  /**
   * @summary 获取用户任务信息
   * @description h5 用户 获取用户任务统计信息
   * @router get /api/mobile/getUserTaskInfo
   * @response 200 ApiResponse 用户任务统计信息
   */
  async getUserTaskInfo() {
    const { ctx, service } = this;

    // 禁用移动端 GET 请求缓存，防止 Telegram WebApp 或部分安卓浏览器强缓存导致数据不刷新
    ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    ctx.set('Pragma', 'no-cache');
    ctx.set('Expires', '0');

    // 兼容多种 userId 的解析方式
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    if (!userId) {
      ctx.throw(401, ctx.__('common.not_logged_in'));
    }

    const user = await ctx.model.SysUser.findByPk(userId);
    // 允许业务员(3)和店长(2)也能在移动端登录查看测试，不仅限于C端用户(4)
    if (!user || ![ 2, 3, 4 ].includes(Number(user.user_type))) {
      ctx.throw(404, 'user.user_not_exist');
    }

    const result = await service.task.getUserTaskInfo(userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取用户任务信息 (POST方式，防强缓存)
   * @description h5 用户 获取用户任务统计信息，专为解决TG端GET强缓存设计
   * @router post /api/mobile/getUserTaskInfoSync
   * @response 200 ApiResponse 用户任务统计信息
   */
  async getUserTaskInfoSync() {
    const { ctx, service } = this;

    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    if (!userId) {
      ctx.throw(401, ctx.__('common.not_logged_in'));
    }

    const user = await ctx.model.SysUser.findByPk(userId);
    if (!user || ![ 2, 3, 4 ].includes(Number(user.user_type))) {
      ctx.throw(404, 'user.user_not_exist');
    }

    const result = await service.task.getUserTaskInfo(userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 搜索任务
   * @description h5 用户 搜索任务
   * @router get /api/mobile/tasks/search
   * @response 200 ApiResponse 搜索任务结果
   */
  async search() {
    const { ctx, service } = this;

    try {
      // 这里的 userId 是从 token 解析出的 SysUser 表主键，兼容多种写法
      const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

      if (!userId) {
        ctx.throw(401, ctx.__('common.not_logged_in'));
      }

      const result = await service.task.search(userId);

      // 如果 service 层直接修改了 ctx.body (比如防连点 429)，说明已经被接管了，直接 return
      if (ctx.body && ctx.body.code === 429) {
        return;
      }

      // 如果返回的状态是 -1 (代表暂无任务)，则通过 message 返回多语言提示，让前端弹窗
      let message = 'success';
      if (result && result.task_status === -1) {
        message = ctx.__('task.task_not_exist_disabled') || '暂无可用任务';
      }

      ctx.body = {
        message,
        code: 200,
        data: result,
      };
    } catch (err) {
      ctx.logger.error('Error in /api/mobile/tasks/search', err);
      // 如果是余额不足 (1) 或者是我们抛出的错误，交由 errorHandler 统一处理
      if (err.message && err.message.includes('余额不足')) {
        err.status = 400;
        err.code = 1;
      }
      throw err;
    }
  }
}

module.exports = TaskController;
