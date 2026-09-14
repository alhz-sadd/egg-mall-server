'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 商家后台-操作日志管理
 * 店铺管理系统操作日志控制器，仅查询本店操作日�? */
class OperationLogController extends Controller {
  /**
   * @summary 获取操作日志列表
   * @description 管理端查询操作日志列表，支持按操作类型、模块、状态、时间范围搜�?   * @router get /api/admin-outer/operation-logs
   */
  async index() {
    const { ctx, service } = this;
    const adminUser = ctx.state.adminOuter;
    const result = await service.sysLog.operationLogs(ctx.query, adminUser);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 批量删除操作日志
   * @description 根据ID数组批量删除本店操作日志
   * @router delete /api/admin-outer/operation-logs/batch
   */
  async batchDestroy() {
    const { ctx, service } = this;
    const { ids } = ctx.request.body;
    ctx.assert(Array.isArray(ids) && ids.length > 0, 422, '请选择要删除的日志');

    const adminUser = ctx.state.adminOuter;
    await service.sysLog.batchDestroyOperationLogs(ids, adminUser);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }

  /**
   * @summary 清空操作日志
   * @description 清空本店所有操作日志
   * @router delete /api/admin-outer/operation-logs/clear
   */
  async clear() {
    const { ctx, service } = this;
    const adminUser = ctx.state.adminOuter;
    await service.sysLog.clearOperationLogs(adminUser);

    ctx.body = {
      code: 200,
      message: '清空成功',
      data: null,
    };
  }
}

module.exports = OperationLogController;
