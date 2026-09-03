'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-业务员管理
 * 单独定义业务员/主管账号的增删改查接口
 */
class SalespersonController extends Controller {
  /**
   * 记录操作日志
   * @param {string} action 动作
   * @param {string} description 描述
   * @param {number} status 状态
   * @param {number} duration 消耗时间（毫秒）
   */
  async recordOperation(action, description, status = 1, duration = 0) {
    const { ctx, service } = this;
    const admin = ctx.state.admin || {};

    await service.adminUser.recordOperationLog({
      admin_id: admin.adminId || null,
      username: admin.username || '',
      module: '业务员管理',
      action,
      description,
      ip: ctx.ip || '127.0.0.1',
      location: '未知',
      duration,
      status,
    });
  }

  /**
   * @summary 获取业务员列表
   * @description 仅返回角色为业务员（2）的账号
   * @router get /api/admin/salespersons
   * @request header string Authorization Bearer admin token
   * @request query string keyword 关键词（账号/昵称）
   * @request query string username 用户账号（模糊查询）
   * @request query string phone 手机号码（模糊查询）
   * @request query integer role 角色：2业务员
   * @request query integer status 状态：1启用 0禁用
   * @request query string start_time 创建时间开始（如 2026-07-01）
   * @request query string end_time 创建时间结束（如 2026-07-31）
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 业务员列表
   */
  async index() {
    const { ctx, service } = this;
    const { keyword, username, phone, role, status, start_time, end_time, page, page_size } = ctx.query;
    const operatorRole = ctx.state.admin.role;

    const result = await service.adminUser.salespersonList(
      { keyword, username, phone, role, status, start_time, end_time, page, page_size },
    );

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取业务员详情
   * @description 仅可查看业务员账号详情
   * @router get /api/admin/salespersons/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 账号ID
   * @response 200 ApiResponse 账号详情
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    const admin = await service.adminUser.detail(id);
    if (admin.role !== 2) {
      ctx.throw(403, '业务员管理仅支持查看业务员账号');
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: admin,
    };
  }

  /**
   * @summary 新增业务员
   * @description 角色只能分配业务员（2）
   * @router post /api/admin/salespersons
   * @request header string Authorization Bearer admin token
   * @request body SalespersonRequest *body 业务员信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const operatorRole = ctx.state.admin.role;
    const startTime = Date.now();

    const admin = await service.adminUser.create(ctx.request.body);
    await this.recordOperation('新增', `新增业务员账号：${admin.username}`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: admin,
    };
  }

  /**
   * @summary 更新业务员
   * @description 仅可更新业务员账号
   * @router put /api/admin/salespersons/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 账号ID
   * @request body SalespersonRequest *body 业务员信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const operatorRole = ctx.state.admin.role;
    const startTime = Date.now();

    const admin = await service.adminUser.update(id, ctx.request.body);
    await this.recordOperation('修改', `更新业务员账号：${admin.username}`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: admin,
    };
  }

  /**
   * @summary 删除业务员
   * @description 仅可删除业务员账号
   * @router delete /api/admin/salespersons/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 账号ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const operatorRole = ctx.state.admin.role;
    const startTime = Date.now();

    await service.adminUser.destroy(id);
    await this.recordOperation('删除', `删除业务员ID：${id}`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }

  /**
   * @summary 重置业务员登录密码
   * @description 仅限上级操作，重置目标用户的登录密码
   * @router post /api/admin/salespersons/:id/reset-password
   * @request header string Authorization Bearer admin token
   * @request path integer *id 账号ID
   * @request body ResetAdminPwdRequest *body 重置密码信息
   * @response 200 ApiResponse 重置成功
   */
  async resetPassword() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const { password } = ctx.request.body;
    const operatorRole = ctx.state.admin.role;
    const startTime = Date.now();

    const result = await service.adminUser.resetPassword(id, password);
    await this.recordOperation('重置密码', `重置业务员账号：${result.username} 的登录密码`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '重置登录密码成功',
      data: result,
    };
  }

  /**
   * @summary 批量删除业务员
   * @description 支持多选删除，仅可删除业务员账号
   * @router post /api/admin/salespersons/batch-delete
   * @request header string Authorization Bearer admin token
   * @request body BatchDeleteRequest *body 账号ID数组
   * @response 200 ApiResponse 删除成功
   */
  async destroyBatch() {
    const { ctx, service } = this;
    const { ids } = ctx.request.body;
    const startTime = Date.now();

    await service.adminUser.destroyBatch(ids);
    await this.recordOperation('批量删除', `批量删除业务员，ID：${(ids || []).join(',')}`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = SalespersonController;
