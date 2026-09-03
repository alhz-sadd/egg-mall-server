'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-操作日志管理
 * 管理端操作日志查询与清理
 */
class AdminOperationLogController extends Controller {
  /**
   * @summary 获取操作日志列表
   * @description 管理端查询操作日志列表，支持按操作类型、标题、操作人员、请求地址、状态、时间范围搜索
   * @router get /api/admin/operation-logs
   * @request header string Authorization Bearer admin token
   * @request query integer business_type 操作类型：0新增 1修改 2删除 3授权 4导出 5导入 6强退 7生成代码 8清空数据 9其他
   * @request query string title 操作标题关键词
   * @request query string oper_name 操作人员名称关键词
   * @request query string oper_url 请求地址关键词
   * @request query integer status 操作状态：0成功 1失败
   * @request query string start_time 开始时间
   * @request query string end_time 结束时间
   * @request query integer page 页码 默认 1
   * @request query integer pageSize 每页数量 默认 10
   * @response 200 ApiResponse 操作日志列表
   */
  async index() {
    const { ctx, service } = this;
    // 商家端（admin-outer）只显示登录店铺自己的数据
    const adminId = ctx.state.admin ? ctx.state.admin.adminId : undefined;
    const result = await service.operationLog.adminList(ctx.query, adminId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 批量删除操作日志
   * @description 管理端根据ID数组批量删除操作日志
   * @router delete /api/admin/operation-logs/batch
   * @request header string Authorization Bearer admin token
   * @request body OperationLogBatchDeleteRequest *body 批量删除参数
   * @response 200 ApiResponse 删除成功
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
   * @router delete /api/admin/operation-logs/clear
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 清空成功
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

module.exports = AdminOperationLogController;
