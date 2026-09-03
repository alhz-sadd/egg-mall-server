'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-角色管理
 */
class RolesController extends Controller {
  /**
   * @summary 获取角色列表
   * @router get /api/admin/role
   * @request header string Authorization Bearer admin token
   */
  async index() {
    const { ctx } = this;
    const { pageNum = 1, pageSize = 10, roleName, roleKey, status } = ctx.query;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const where = {};
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }

    if (roleName) where.roleName = { [ctx.model.Sequelize.Op.like]: `%${roleName}%` };
    if (roleKey) where.roleKey = { [ctx.model.Sequelize.Op.like]: `%${roleKey}%` };
    if (status) where.status = status;
    where.delFlag = '0'; // 0代表未删除

    const offset = (Number(pageNum) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const { count, rows } = await ctx.model.Role.findAndCountAll({
      where,
      order: [[ 'roleSort', 'ASC' ]],
      offset,
      limit,
    });

    const allMenus = await ctx.model.Menu.findAll({
      attributes: [ 'id', 'permission' ],
    });

    const list = await Promise.all(rows.map(async item => {
      const role = item.toJSON();
      const permissionNames = await ctx.service.permission.getRolePermissionNames(role.id);

      const roleMenus = await ctx.model.RoleMenu.findAll({
        where: { role_id: role.id },
        attributes: [ 'menu_id' ],
      });
      let menuIds = roleMenus.map(rm => rm.menu_id);

      if (menuIds.length === 0) {
        if (role.roleKey === 'admin' || role.roleKey === 'root' || permissionNames.includes('*:*:*')) {
          menuIds = allMenus.map(m => m.id);
        } else if (permissionNames.length > 0) {
          menuIds = allMenus
            .filter(m => m.permission && permissionNames.includes(m.permission))
            .map(m => m.id);
        }
      }

      return {
        ...role,
        roleId: role.id,
        admin: role.roleKey === 'admin' || role.roleKey === 'root', // admin/root 拥有所有权限
        flag: false,
        menuIds,
        deptIds: null,
        permissions: permissionNames,
      };
    }));

    ctx.body = {
      code: 200,
      msg: '查询成功',
      rows: list,
      total: count,
    };
  }

  /**
   * @summary 获取角色详情
   * @router get /api/admin/role/:id
   */
  async show() {
    const { ctx } = this;
    const { id } = ctx.params;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const role = await ctx.model.Role.findByPk(id);
    if (!role) {
      ctx.throw(404, '角色不存在');
    }
    if (adminId !== undefined && role.admin_id !== adminId) {
      ctx.throw(403, '无权访问该店铺角色');
    }

    const data = role.toJSON();
    data.roleId = data.id;

    // 获取该角色关联的菜单ID数组
    const roleMenus = await ctx.model.RoleMenu.findAll({
      where: { role_id: role.id },
      attributes: [ 'menu_id' ],
    });
    let menuIds = roleMenus.map(rm => rm.menu_id);
    const permissionNames = await ctx.service.permission.getRolePermissionNames(role.id);

    // 如果 role_menus 表中没有记录，且有旧的权限记录，进行兼容处理
    if (menuIds.length === 0) {
      if (permissionNames.includes('*:*:*')) {
        const menus = await ctx.model.Menu.findAll({ attributes: [ 'id' ] });
        menuIds = menus.map(m => m.id);
      } else if (permissionNames.length > 0) {
        const menus = await ctx.model.Menu.findAll({ attributes: [ 'id', 'permission' ] });
        menuIds = menus
          .filter(m => m.permission && permissionNames.includes(m.permission))
          .map(m => m.id);
      }
    }

    data.menuIds = menuIds;

    ctx.body = {
      code: 200,
      msg: '操作成功',
      data,
    };
  }

  /**
   * @summary 获取角色已勾选菜单 ID
   * @router get /api/admin/system/role/getRoleMenuIds
   */
  async getRoleMenuIds() {
    const { ctx } = this;
    const { roleId } = ctx.query;

    if (!roleId) {
      ctx.throw(400, 'roleId 不能为空');
    }

    const role = await ctx.model.Role.findByPk(roleId);
    if (!role) {
      ctx.throw(404, '角色不存在');
    }

    // 获取该角色关联的菜单ID数组
    const roleMenus = await ctx.model.RoleMenu.findAll({
      where: { role_id: role.id },
      attributes: [ 'menu_id' ],
    });
    let menuIds = roleMenus.map(rm => rm.menu_id);
    const permissionNames = await ctx.service.permission.getRolePermissionNames(role.id);

    // 如果 role_menus 表中没有记录，且有旧的权限记录，进行兼容处理
    if (menuIds.length === 0) {
      if (permissionNames.includes('*:*:*')) {
        const menus = await ctx.model.Menu.findAll({ attributes: [ 'id' ] });
        menuIds = menus.map(m => m.id);
      } else if (permissionNames.length > 0) {
        const menus = await ctx.model.Menu.findAll({ attributes: [ 'id', 'permission' ] });
        menuIds = menus
          .filter(m => m.permission && permissionNames.includes(m.permission))
          .map(m => m.id);
      }
    }

    ctx.body = {
      code: 200,
      msg: '操作成功',
      data: menuIds,
    };
  }

  /**
   * @summary 新增角色
   * @router post /api/admin/role
   */
  async create() {
    const { ctx } = this;
    const { body } = ctx.request;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const whereBase = { delFlag: '0' };
    if (adminId !== undefined) {
      whereBase.admin_id = adminId;
    }

    // 校验唯一性
    const existingName = await ctx.model.Role.findOne({
      where: { roleName: body.roleName, ...whereBase },
    });
    if (existingName) {
      ctx.throw(400, '新增角色失败，角色名称已存在');
    }

    const existingKey = await ctx.model.Role.findOne({
      where: { roleKey: body.roleKey, ...whereBase },
    });
    if (existingKey) {
      ctx.throw(400, '新增角色失败，角色权限标识已存在');
    }

    const roleData = {
      roleName: body.roleName,
      roleKey: body.roleKey,
      roleSort: body.roleSort || 0,
      status: body.status || '0',
      menuCheckStrictly: body.menuCheckStrictly ?? true,
      deptCheckStrictly: body.deptCheckStrictly ?? true,
      remark: body.remark || '',
      createBy: ctx.state.admin ? ctx.state.admin.username : 'admin',
    };
    if (adminId !== undefined) {
      roleData.admin_id = adminId;
    }

    const role = await ctx.model.Role.create(roleData);

    // 如果传了菜单ID数组，则同步更新权限关联表
    if (body.menuIds && Array.isArray(body.menuIds)) {
      await ctx.service.permission.assignRoleMenus(role.id, body.menuIds);
    }

    ctx.body = {
      code: 200,
      msg: '新增成功',
      data: role,
    };
  }

  /**
   * @summary 修改角色权限
   * @router put /api/admin/role/:id
   */
  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { body } = ctx.request;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const role = await ctx.model.Role.findByPk(id);
    if (!role) {
      ctx.throw(404, '角色不存在');
    }
    if (adminId !== undefined && role.admin_id !== adminId) {
      ctx.throw(403, '无权修改该店铺角色');
    }

    const whereBase = { delFlag: '0', id: { [ctx.model.Sequelize.Op.ne]: id } };
    if (adminId !== undefined) {
      whereBase.admin_id = adminId;
    }

    // 不允许修改超级管理员的 key
    if (role.roleKey === 'admin' && body.roleKey && body.roleKey !== 'admin') {
      ctx.throw(400, '不允许修改超级管理员角色权限字符');
    }

    // 校验唯一性（排除自身）
    if (body.roleName && body.roleName !== role.roleName) {
      const existingName = await ctx.model.Role.findOne({
        where: { roleName: body.roleName, ...whereBase },
      });
      if (existingName) {
        ctx.throw(400, '修改角色失败，角色名称已存在');
      }
    }

    if (body.roleKey && body.roleKey !== role.roleKey) {
      const existingKey = await ctx.model.Role.findOne({
        where: { roleKey: body.roleKey, ...whereBase },
      });
      if (existingKey) {
        ctx.throw(400, '修改角色失败，角色权限标识已存在');
      }
    }

    await role.update({
      roleName: body.roleName !== undefined ? body.roleName : role.roleName,
      roleKey: body.roleKey !== undefined ? body.roleKey : role.roleKey,
      roleSort: body.roleSort !== undefined ? body.roleSort : role.roleSort,
      status: body.status !== undefined ? body.status : role.status,
      menuCheckStrictly: body.menuCheckStrictly !== undefined ? body.menuCheckStrictly : role.menuCheckStrictly,
      deptCheckStrictly: body.deptCheckStrictly !== undefined ? body.deptCheckStrictly : role.deptCheckStrictly,
      remark: body.remark !== undefined ? body.remark : role.remark,
      updateBy: ctx.state.admin ? ctx.state.admin.username : 'admin',
    });

    // 如果传了菜单ID数组，则同步更新权限关联表
    if (body.menuIds && Array.isArray(body.menuIds)) {
      await ctx.service.permission.assignRoleMenus(id, body.menuIds);
    }

    ctx.body = {
      code: 200,
      msg: '修改成功',
      data: role,
    };
  }

  /**
   * @summary 删除角色
   * @router delete /api/admin/role/:id
   */
  async destroy() {
    const { ctx } = this;
    // 支持批量删除 "1,2,3"
    const ids = ctx.params.id.split(',').map(Number);
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const where = { id: { [ctx.model.Sequelize.Op.in]: ids } };
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }

    // 不允许删除 admin
    const roles = await ctx.model.Role.findAll({
      where,
    });

    if (roles.some(r => r.roleKey === 'admin')) {
      ctx.throw(400, '不允许删除超级管理员角色');
    }

    await ctx.model.Role.update(
      { delFlag: '2' },
      { where },
    );

    ctx.body = {
      code: 200,
      msg: '删除成功',
    };
  }
}

module.exports = RolesController;
