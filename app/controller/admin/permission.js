'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-权限管理
 * 管理端权限树与角色权限分配控制器
 */
class PermissionController extends Controller {
  /**
   * @summary 获取权限树
   * @description 返回完整权限树结构，默认返回全部节点（含禁用）
   * @router get /api/admin/permissions/tree
   * @request header string Authorization Bearer admin token
   * @request query integer status 状态：1启用 0禁用
   * @response 200 ApiResponse 权限树
   */
  async tree() {
    const { ctx, service } = this;
    const { status } = ctx.query;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.permission.tree({ status }, adminId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取权限列表
   * @description 返回扁平权限列表
   * @router get /api/admin/permissions
   * @request header string Authorization Bearer admin token
   * @request query integer status 状态：1启用 0禁用
   * @request query integer page 页码
   * @request query integer page_size 每页数量
   * @response 200 ApiResponse 权限列表
   */
  async index() {
    const { ctx, service } = this;
    const { status, page, page_size } = ctx.query;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.permission.list({ status, page, page_size }, adminId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 创建权限节点
   * @description 创建新的权限树节点
   * @router post /api/admin/permissions
   * @request header string Authorization Bearer admin token
   * @request body PermissionRequest *body 权限信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const permission = await service.permission.create(ctx.request.body, adminId);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: permission,
    };
  }

  /**
   * @summary 更新权限节点
   * @description 根据权限ID更新节点信息
   * @router put /api/admin/permissions/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 权限ID
   * @request body PermissionRequest *body 权限信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    const permission = await service.permission.update(id, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: permission,
    };
  }

  /**
   * @summary 删除权限节点
   * @description 根据权限ID删除节点，存在子节点时无法删除
   * @router delete /api/admin/permissions/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 权限ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    await service.permission.destroy(id, adminId);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }

  /**
   * @summary 获取角色权限
   * @description 获取指定角色拥有的权限标识列表
   * @router get /api/admin/roles/:role/permissions
   * @request header string Authorization Bearer admin token
   * @request path integer *role 角色：1管理员 2主管 3业务员
   * @response 200 ApiResponse 权限标识列表
   */
  async rolePermissions() {
    const { ctx, service } = this;
    const { role } = ctx.params;

    const result = await service.permission.getRolePermissionNames(Number(role));

    ctx.body = {
      code: 200,
      message: 'success',
      data: { permission_names: result },
    };
  }

  /**
   * @summary 分配角色权限
   * @description 为指定角色分配权限标识列表
   * @router put /api/admin/roles/:role/permissions
   * @request header string Authorization Bearer admin token
   * @request path integer *role 角色：1管理员 2主管 3业务员
   * @request body RolePermissionRequest *body 权限标识列表
   * @response 200 ApiResponse 分配成功
   */
  async assignRolePermissions() {
    const { ctx, service } = this;
    const { role } = ctx.params;
    const { permission_names } = ctx.request.body;

    await service.permission.assignRolePermissions(Number(role), permission_names);

    ctx.body = {
      code: 200,
      message: '分配成功',
      data: null,
    };
  }
}

module.exports = PermissionController;
