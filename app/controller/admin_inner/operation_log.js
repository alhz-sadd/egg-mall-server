'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 总后台-操作日志管理
 * 内部管理系统操作日志控制器，查询全平台操作日志
 */
class OperationLogController extends Controller {
  /**
   * @summary 获取操作日志列表
   * @description 管理端查询操作日志列表，支持按操作类型、标题、操作人员、请求地址、状态、时间范围搜索
   * @router get /api/admin-inner/operation-logs
   */
  async index() {
    const { ctx, service } = this;
    // 模拟传入 A 端的权限对象，以支持在 Service 中按照 shop_id 进行过滤
    const adminUser = { user_type: 1 };

    // 使用 adminOperationLogs 方法，保持和B端获取后台操作日志一致的返回结构
    const result = await service.sysLog.adminOperationLogs(ctx.query, adminUser);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 批量删除操作日志
   * @description 管理端根据ID数组批量删除操作日志
   * @router delete /api/admin-inner/operation-logs/batch
   */
  async batchDestroy() {
    const { ctx, service } = this;
    await service.sysLog.batchDestroyOperationLogs(ctx.request.body.ids);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }

  /**
   * @summary 清空操作日志
   * @description 管理端清空所有操作日志
   * @router delete /api/admin-inner/operation-logs/clear
   */
  async clear() {
    const { ctx, service } = this;
    await service.sysLog.clearOperationLogs();

    ctx.body = {
      code: 200,
      message: '清空成功',
      data: null,
    };
  }
}

module.exports = OperationLogController;
