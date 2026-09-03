'use strict';

const Service = require('egg').Service;

/**
 * 权限树服务层
 */
class PermissionService extends Service {
  /**
   * 获取权限列表
   * @param {Object} query 查询参数
   * @param adminId
   * @return {Object} 分页结果
   */
  async list(query = {}, adminId) {
    const { ctx } = this;
    const { status, page, page_size = 1000 } = query;

    const where = {};
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    if (status !== undefined) {
      where.status = status;
    }

    // 不分页时返回全部
    if (!page) {
      const rows = await ctx.model.Permission.findAll({
        where,
        order: [[ 'sort', 'ASC' ], [ 'id', 'ASC' ]],
      });
      return { list: rows };
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);
    const { count, rows } = await ctx.model.Permission.findAndCountAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'ASC' ]],
      offset,
      limit,
    });

    return {
      list: rows,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 获取完整权限树
   * 默认返回全部节点（含禁用）
   * @param {Object} query 查询参数
   * @param adminId
   * @return {Array} 树形结构
   */
  async tree(query = {}, adminId) {
    const { ctx } = this;
    const { status } = query;

    const where = {};
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    if (status !== undefined) {
      where.status = status;
    }

    const permissions = await ctx.model.Permission.findAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'ASC' ]],
    });

    return this.buildTree(permissions);
  }

  /**
   * 构建权限树
   * @param {Array} permissions 权限数据
   * @param {number} parentId 父节点ID
   * @return {Array} 树形结构
   */
  buildTree(permissions, parentId = 0) {
    const result = [];
    for (const item of permissions) {
      if (item.parent_id === parentId) {
        const node = item.toJSON ? item.toJSON() : item;
        const children = this.buildTree(permissions, item.id);
        if (children.length) {
          node.children = children;
        }
        result.push(node);
      }
    }
    return result;
  }

  /**
   * 创建权限节点
   * @param {Object} payload 权限数据
   * @param adminId
   * @return {Object} 创建后的权限
   */
  async create(payload, adminId) {
    const { ctx } = this;
    ctx.assert(payload.title, 422, '权限标题不能为空');
    ctx.assert(payload.name, 422, '权限标识不能为空');

    const whereBase = {};
    if (adminId !== undefined) {
      whereBase.admin_id = adminId;
      payload.admin_id = adminId;
    }

    const exist = await ctx.model.Permission.findOne({ where: { name: payload.name, ...whereBase } });
    if (exist) {
      ctx.throw(422, '权限标识已存在');
    }

    const permission = await ctx.model.Permission.create(payload);
    return permission.toJSON();
  }

  /**
   * 更新权限节点
   * @param {number} id 权限ID
   * @param {Object} payload 权限数据
   * @return {Object} 更新后的权限
   */
  async update(id, payload) {
    const { ctx } = this;
    const permission = await ctx.model.Permission.findByPk(id);
    if (!permission) {
      ctx.throw(404, '权限节点不存在');
    }

    // 如果修改标识，检查是否与其他节点冲突
    if (payload.name && payload.name !== permission.name) {
      const exist = await ctx.model.Permission.findOne({ where: { name: payload.name } });
      if (exist) {
        ctx.throw(422, '权限标识已存在');
      }
    }

    await permission.update(payload);
    return permission.toJSON();
  }

  /**
   * 删除权限节点
   * @param {number} id 权限ID
   * @param adminId
   */
  async destroy(id, adminId) {
    const { ctx } = this;
    const permission = await ctx.model.Permission.findByPk(id);
    if (!permission) {
      ctx.throw(404, '权限节点不存在');
    }
    if (adminId !== undefined && permission.admin_id !== adminId) {
      ctx.throw(403, '无权操作该店铺权限');
    }

    // 检查是否有子节点
    const children = await ctx.model.Permission.count({ where: { parent_id: id } });
    if (children > 0) {
      ctx.throw(422, '该权限节点下存在子节点，无法删除');
    }

    await permission.destroy();
  }

  /**
   * 获取角色的权限标识列表
   * @param {number} role 角色值
   * @return {Array<string>} 权限标识列表
   */
  async getRolePermissionNames(role) {
    const { ctx } = this;
    const rows = await ctx.model.RolePermission.findAll({
      where: { role },
      attributes: [ 'permission_name' ],
      order: [[ 'id', 'ASC' ]],
    });
    return rows.map(item => item.permission_name);
  }

  /**
   * 为角色分配权限
   * @param {number} role 角色值
   * @param {Array<string>} permissionNames 权限标识列表
   */
  async assignRolePermissions(role, permissionNames) {
    const { ctx } = this;
    ctx.assert(role, 422, '角色ID不能为空');
    ctx.assert(Array.isArray(permissionNames), 422, '权限标识列表必须为数组');

    // 过滤有效权限标识
    const validNames = [];
    for (const name of permissionNames) {
      const permission = await ctx.model.Permission.findOne({ where: { name } });
      if (permission) {
        validNames.push(name);
      }
    }

    // 删除旧权限，写入新权限
    await ctx.model.RolePermission.destroy({ where: { role } });
    if (validNames.length) {
      await ctx.model.RolePermission.bulkCreate(
        validNames.map(name => ({ role, permission_name: name })),
      );
    }
  }

  /**
   * 为角色分配菜单权限
   * @param {number} roleId 角色ID
   * @param {Array<number>} menuIds 菜单ID数组
   */
  async assignRoleMenus(roleId, menuIds) {
    const { ctx } = this;
    ctx.assert(roleId, 422, '角色ID不能为空');
    ctx.assert(Array.isArray(menuIds), 422, '菜单ID列表必须为数组');

    // 1. 同步角色菜单表 (role_menus) 以供回显
    await ctx.model.RoleMenu.destroy({ where: { role_id: roleId } });
    if (menuIds.length > 0) {
      await ctx.model.RoleMenu.bulkCreate(
        menuIds.map(id => ({ role_id: roleId, menu_id: id })),
      );
    }

    // 2. 获取菜单对应的权限标识符
    const menus = await ctx.model.Menu.findAll({
      where: {
        id: { [ctx.model.Sequelize.Op.in]: menuIds },
      },
      attributes: [ 'permission' ],
    });

    const permissionNames = menus
      .map(m => m.permission)
      .filter(p => !!p);

    // 3. 去重
    const uniquePermissionNames = [ ...new Set(permissionNames) ];

    // 4. 调用分配权限方法 (role_permissions)
    await this.assignRolePermissions(roleId, uniquePermissionNames);
  }
}

module.exports = PermissionService;
