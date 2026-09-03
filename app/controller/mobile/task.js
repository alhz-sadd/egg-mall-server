'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-任务库
 * 移动端任务控制器
 */
class TaskController extends Controller {
  /**
   * @summary 获取任务列表
   * @description 移动端任务列表，仅返回启用状态（status=1），支持关键词搜索
   * @router get /api/mobile/tasks
   * @request query string keyword 关键词（按名称模糊搜索）
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 任务列表
   */
  async index() {
    const { ctx, service } = this;
    const { keyword, page, page_size } = ctx.query;

    const result = await service.task.list({ keyword, page, page_size });

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取任务详情
   * @description 根据任务ID获取详情
   * @router get /api/mobile/tasks/:id
   * @request path integer *id 任务ID
   * @response 200 ApiResponse 任务详情
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    const task = await service.task.detail(id);

    ctx.body = {
      code: 200,
      message: 'success',
      data: task,
    };
  }
  /**
   * @summary 获取用户任务信息
   * @description h5 用户 获取用户任务统计信息
   * @router get /api/mobile/getUserTaskInfo
   * @response 200 ApiResponse 用户任务统计信息
   */
  async getUserTaskInfo() {
    const { ctx, service } = this;
    const userCode = ctx.state.user.userId;

    const user = await ctx.model.User.findOne({ where: { user_id: userCode } });
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    const userId = user.id;
    const userVip = user.user_vip || 1;

    const result = await service.task.getUserTaskInfo(userId, userVip);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 搜索任务
   * @description h5 用户 搜索任务
   * @router get /api/mobile/searchTask
   * @response 200 ApiResponse 搜索任务结果
   */
  async searchTask() {
    const { ctx, service } = this;
    try {
      const userCode = ctx.state.user.userId;

      const user = await ctx.model.User.findOne({ where: { user_id: userCode } });
      if (!user) {
        // 根据之前的约定，用户不存在也返回500和明确信息
        ctx.body = { msg: '用户不存在', code: 500, status: false };
        return;
      }

      const result = await service.task.searchTask(user.id, user.user_vip || 1);

      ctx.body = {
        msg: '操作成功',
        code: 200,
        data: result,
        status: true,
      };
    } catch (err) {
      // 将服务层抛出的原始错误信息直接用于返回，以便诊断
      ctx.logger.error('Error in /api/mobile/searchTask', err);
      ctx.body = {
        msg: err.message,
        code: 500,
        status: false,
      };
    }
  }
}

module.exports = TaskController;
