'use strict';

const Controller = require('egg').Controller;

class SysRoleController extends Controller {
  /**
   * 获取角色列表
   * GET /api/admin-inner/system/role
   */
  async index() {
    const { ctx } = this;
    const { role_name, role_code, page = 1, page_size = 20 } = ctx.query;

    const where = {};
    if (role_name) {
      where.role_name = { [ctx.app.Sequelize.Op.like]: `%${role_name}%` };
    }
    if (role_code) {
      where.role_code = { [ctx.app.Sequelize.Op.like]: `%${role_code}%` };
    }

    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;

    const { count, rows } = await ctx.model.SysRole.findAndCountAll({
      where,
      limit,
      offset,
      order: [[ 'role_id', 'ASC' ]],
    });

    // 兼容前端需要的字段格式
    const data = rows.map(role => {
      const item = role.toJSON();
      item.id = item.role_id;
      item.name = item.role_name;
      item.code = item.role_code;
      return item;
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        total: count,
        rows: data,
        // 为了兼容某些前端直接读取 data 为数组的情况，有时候会额外放到外面，但标准分页是 { total, rows }
      },
    };
  }

  /**
   * 新增角色
   * POST /api/admin-inner/system/role
   */
  async create() {
    const { ctx } = this;
    const { role_name, role_code, remark, name, code } = ctx.request.body;

    const finalRoleName = role_name || name;
    const finalRoleCode = role_code || code;

    if (!finalRoleName || !finalRoleCode) {
      ctx.throw(400, '角色名称和编码不能为空');
    }

    // 检查是否重复
    const exist = await ctx.model.SysRole.findOne({ where: { role_code: finalRoleCode } });
    if (exist) {
      ctx.throw(400, '角色编码已存在');
    }

    const role = await ctx.model.SysRole.create({
      role_name: finalRoleName,
      role_code: finalRoleCode,
      remark: remark || null,
    });

    const result = role.toJSON();
    result.id = result.role_id;
    result.name = result.role_name;
    result.code = result.role_code;

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: result,
    };
  }

  /**
   * 更新角色
   * PUT /api/admin-inner/system/role/:id
   */
  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { role_name, role_code, remark, name, code } = ctx.request.body;

    const role = await ctx.model.SysRole.findByPk(id);
    if (!role) {
      ctx.throw(404, '角色不存在');
    }

    const finalRoleName = role_name || name || role.role_name;
    const finalRoleCode = role_code || code || role.role_code;

    // 检查编码是否被其他角色占用
    if (finalRoleCode !== role.role_code) {
      const exist = await ctx.model.SysRole.findOne({ where: { role_code: finalRoleCode } });
      if (exist) {
        ctx.throw(400, '角色编码已存在');
      }
    }

    await role.update({
      role_name: finalRoleName,
      role_code: finalRoleCode,
      remark: remark !== undefined ? remark : role.remark,
    });

    const result = role.toJSON();
    result.id = result.role_id;
    result.name = result.role_name;
    result.code = result.role_code;

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: result,
    };
  }

  /**
   * 删除角色
   * DELETE /api/admin-inner/system/role/:id
   */
  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    const role = await ctx.model.SysRole.findByPk(id);
    if (!role) {
      ctx.throw(404, '角色不存在');
    }

    // 可选：检查是否还有用户绑定此角色
    const userRoleCount = await ctx.model.SysUserRole.count({ where: { role_id: id } });
    if (userRoleCount > 0) {
      ctx.throw(400, '该角色已被分配给用户，无法删除');
    }

    // 删除角色与菜单的关联
    if (ctx.model.SysRoleMenu) {
      await ctx.model.SysRoleMenu.destroy({ where: { role_id: id } });
    }

    await role.destroy();

    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }

  /**
   * 获取角色已绑定的菜单ID集合 (用于回显)
   * GET /api/admin-inner/system/role/:id/menus
   */
  async getRoleMenus() {
    const { ctx } = this;
    const { id } = ctx.params;

    const role = await ctx.model.SysRole.findByPk(id);
    if (!role) {
      ctx.throw(404, '角色不存在');
    }

    // 如果是店长角色，默认拥有 outer 的所有菜单，直接查询所有的 outer 菜单ID返回
    if (role.role_code === 'shop_owner') {
      const allOuterMenus = await ctx.model.SysMenu.findAll({
        where: { api_tag: 'outer' },
        attributes: [ 'menu_id' ],
      });
      ctx.body = {
        code: 200,
        message: 'success',
        data: allOuterMenus.map(m => m.menu_id),
      };
      return;
    }

    let menuIds = [];
    if (ctx.model.SysRoleMenu) {
      const roleMenus = await ctx.model.SysRoleMenu.findAll({
        where: { role_id: id },
        attributes: [ 'menu_id' ],
      });
      menuIds = roleMenus.map(rm => rm.menu_id);
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: menuIds,
    };
  }

  /**
   * 更新角色绑定的菜单权限
   * PUT /api/admin-inner/system/role/:id/menus
   */
  async updateRoleMenus() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { menuIds } = ctx.request.body; // 接收一个菜单ID数组

    const role = await ctx.model.SysRole.findByPk(id);
    if (!role) {
      ctx.throw(404, '角色不存在');
    }

    // A端不允许修改店长的权限，保证店长始终拥有全量外端权限
    if (role.role_code === 'shop_owner') {
      ctx.throw(403, '店长角色拥有最高权限，不允许手动修改');
    }

    if (!Array.isArray(menuIds)) {
      ctx.throw(400, 'menuIds必须是一个数组');
    }

    if (ctx.model.SysRoleMenu) {
      // 开启事务进行替换操作
      await ctx.model.transaction(async t => {
        // 1. 删除旧的绑定关系
        await ctx.model.SysRoleMenu.destroy({
          where: { role_id: id },
          transaction: t,
        });

        // 2. 插入新的绑定关系
        if (menuIds.length > 0) {
          const records = menuIds.map(menu_id => ({
            role_id: id,
            menu_id,
          }));
          await ctx.model.SysRoleMenu.bulkCreate(records, { transaction: t });
        }
      });
    }

    ctx.body = {
      code: 200,
      message: '授权成功',
    };
  }
}

module.exports = SysRoleController;
