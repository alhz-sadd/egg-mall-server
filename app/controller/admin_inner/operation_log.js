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
    const result = await service.operationLog.adminList(ctx.query);

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
    await service.operationLog.batchDestroy(ctx.request.body.ids);

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
    await service.operationLog.clearAll();

    ctx.body = {
      code: 200,
      message: '清空成功',
      data: null,
    };
  }
}

module.exports = OperationLogController;
