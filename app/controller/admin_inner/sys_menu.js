'use strict';

const Controller = require('egg').Controller;

class SysMenuController extends Controller {
  /**
   * 获取菜单列表
   * GET /api/admin-inner/system/menu
   */
  async index() {
    const { ctx } = this;
    const { api_tag, menu_name, enable } = ctx.query;

    const where = {};
    if (api_tag) where.api_tag = api_tag;
    if (menu_name) where.menu_name = { [ctx.app.Sequelize.Op.like]: `%${menu_name}%` };
    if (enable !== undefined && enable !== '') where.enable = enable;

    const menus = await ctx.model.SysMenu.findAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'menu_id', 'ASC' ]],
    });

    // 构建树形结构
    const buildTree = (menus, parentId = 0) => {
      const tree = [];
      for (const menu of menus) {
        if (Number(menu.parent_id) === Number(parentId)) {
          const item = menu.toJSON();

          // 兼容前端所需字段 (Vue Element UI 需要 id 作为 row-key 等)
          item.id = item.menu_id;
          item.name = item.menu_name;
          item.path = item.route_path || '';
          item.type = item.menu_type;
          item.status = item.enable;
          item.permission = item.perms || '';
          item.icon = item.icon || '';
          // 双向绑定常用字段映射
          item.visible = 0; // 如果有hidden逻辑可以拓展
          item.is_frame = 1;
          item.is_cache = 0;

          const children = buildTree(menus, menu.menu_id);
          if (children.length > 0) {
            item.children = children;
          }
          tree.push(item);
        }
      }
      return tree;
    };

    let data = menus;
    // 如果没有条件查询，通常返回树形结构；如果有条件查询，返回平铺结构或过滤后的树
    // 为了兼容前端，统一返回树形结构，如果是带条件的查询则直接返回平铺以展示结果
    if (Object.keys(where).length === 0) {
      data = buildTree(menus, 0);
    } else {
      // 仍然尝试构建树，如果构建失败（由于条件过滤导致父节点缺失），则返回平铺
      const treeData = buildTree(menus, 0);
      if (treeData.length > 0) {
        data = treeData;
      } else {
        // 平铺也需要做映射
        data = menus.map(menu => {
          const item = menu.toJSON();
          item.id = item.menu_id;
          item.name = item.menu_name;
          item.path = item.route_path || '';
          item.type = item.menu_type;
          item.status = item.enable;
          item.permission = item.perms || '';
          item.icon = item.icon || '';
          item.visible = 0;
          item.is_frame = 1;
          item.is_cache = 0;
          return item;
        });
      }
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data,
    };
  }

  // 获取单个菜单详情
  async show() {
    const { ctx } = this;
    const id = ctx.params.id;

    try {
      const menu = await ctx.model.SysMenu.findByPk(id);
      if (!menu) {
        ctx.body = { code: 404, message: '菜单不存在' };
        return;
      }

      const menuData = menu.toJSON();

      // 为前端兼容补充额外字段
      menuData.id = menuData.menu_id;
      menuData.name = menuData.menu_name;
      menuData.path = menuData.route_path || '';
      menuData.type = menuData.menu_type;
      menuData.status = menuData.enable;
      menuData.permission = menuData.perms || '';

      ctx.body = {
        code: 200,
        message: '操作成功',
        data: menuData,
      };
    } catch (error) {
      ctx.logger.error('获取菜单详情失败:', error);
      ctx.body = { code: 500, message: '服务器错误' };
    }
  }

  /**
   * 新增菜单
   * POST /api/admin-inner/system/menu
   */
  async create() {
    const { ctx } = this;
    const { body } = ctx.request;

    const {
      parent_id, menu_name, route_path, component, api_tag,
      perms, menu_type, sort, enable,
      name, path, type, status, permission, icon,
    } = body;

    const finalMenuName = menu_name || name;
    const finalRoutePath = route_path || path;
    const finalMenuType = menu_type !== undefined ? menu_type : type;

    // 创建接口也同步修改为优先取 permission
    const finalPerms = permission !== undefined && permission !== null ? permission : perms;

    // 优先取 status (因为前端表单通常绑定在 status 上)，如果没有再取 enable
    const finalEnable = status !== undefined ? status : enable;

    if (!finalMenuName || !api_tag || finalMenuType === undefined) {
      ctx.throw(400, '缺少必填参数');
    }

    // 避免传入显式的主键 ID，强制由数据库自增
    const menu = await ctx.model.SysMenu.create({
      parent_id: parent_id || 0,
      menu_name: finalMenuName,
      route_path: finalRoutePath || null,
      component: component || null,
      api_tag,
      perms: finalPerms || null,
      menu_type: finalMenuType,
      sort: sort || 0,
      enable: finalEnable !== undefined ? finalEnable : 1,
      icon: icon || null,
    });

    const result = menu.toJSON();
    result.id = result.menu_id;
    result.name = result.menu_name;
    result.path = result.route_path || '';
    result.type = result.menu_type;
    result.status = result.enable;
    result.permission = result.perms || '';
    result.icon = result.icon || '';

    ctx.body = {
      code: 200,
      message: '操作成功',
      data: result,
    };
  }

  /**
   * 更新菜单
   * PUT /api/admin-inner/system/menu/:id
   */
  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { body } = ctx.request;

    const menu = await ctx.model.SysMenu.findByPk(id);
    if (!menu) {
      ctx.throw(404, '菜单不存在');
    }

    const {
      parent_id, menu_name, route_path, component, api_tag,
      perms, menu_type, sort, enable, icon,
      name, path, type, status, permission,
    } = body;

    const finalMenuName = menu_name !== undefined ? menu_name : name;
    const finalRoutePath = route_path !== undefined ? route_path : path;
    const finalMenuType = menu_type !== undefined ? menu_type : type;

    // 修复权限字段优先级：前端表单双向绑定的是 permission，而 perms 往往是接口回显带上来的旧数据。
    // 所以应当优先使用 permission，只有当 permission 没有传时才使用 perms。
    const finalPerms = permission !== undefined && permission !== null ? permission : perms;

    // 优先取 status (因为前端表单通常绑定在 status 上)，如果没有再取 enable
    const finalEnable = status !== undefined ? status : enable;

    // 防止自己作为自己的父级
    if (parent_id !== undefined && Number(parent_id) === Number(id)) {
      ctx.throw(400, '父级菜单不能是自己');
    }

    // 只要是前端表单字段传了 undefined 以外的值（包括 null/空字符串），我们就更新它。
    // 但是这里需要注意：如果前端传了空字符串 ''，我们也要接收并保存，而不是忽略它。
    const updateData = {};
    if (parent_id !== undefined) updateData.parent_id = parent_id;
    if (finalMenuName !== undefined) updateData.menu_name = finalMenuName;
    if (finalRoutePath !== undefined) updateData.route_path = finalRoutePath;
    if (component !== undefined) updateData.component = component;
    if (api_tag !== undefined) updateData.api_tag = api_tag;
    if (finalPerms !== undefined) updateData.perms = finalPerms;
    if (finalMenuType !== undefined) updateData.menu_type = finalMenuType;
    if (sort !== undefined) updateData.sort = sort;
    if (finalEnable !== undefined) updateData.enable = finalEnable;
    if (icon !== undefined) updateData.icon = icon;

    if (Object.keys(updateData).length > 0) {
      await menu.update(updateData);
    }

    const result = menu.toJSON();
    result.id = result.menu_id;
    result.name = result.menu_name;
    result.path = result.route_path || '';
    result.type = result.menu_type;
    result.status = result.enable;
    result.permission = result.perms || '';
    result.icon = result.icon || '';

    ctx.body = {
      code: 200,
      message: '操作成功',
      data: result,
    };
  }

  /**
   * 删除菜单
   * POST /api/admin-inner/system/menu/delete
   * (兼容老的 DELETE /api/admin-inner/system/menu/:id)
   */
  async destroy() {
    const { ctx, app } = this;
    // 兼容 POST 传参和 DELETE URL传参
    const id = ctx.params.id || (ctx.request.body && ctx.request.body.id);

    if (!id) {
      ctx.throw(400, '缺少菜单ID');
    }

    const menu = await ctx.model.SysMenu.findByPk(id);
    if (!menu) {
      ctx.throw(404, '菜单不存在');
    }

    // 递归获取所有子节点ID
    const getAllChildMenuIds = async rootId => {
      const ids = [ Number(rootId) ];
      const children = await ctx.model.SysMenu.findAll({
        where: { parent_id: rootId },
        attributes: [ 'menu_id' ],
        raw: true,
      });
      for (const item of children) {
        const childIds = await getAllChildMenuIds(item.menu_id);
        ids.push(...childIds);
      }
      return ids;
    };

    const menuIds = await getAllChildMenuIds(id);

    // 事务包裹，保证原子性
    const transaction = await ctx.model.transaction();
    try {
      // 1. 删除 sys_role_menu 表中关联记录
      await ctx.model.SysRoleMenu.destroy({
        where: { menu_id: menuIds },
        transaction,
      });

      // 2. 删除菜单本身
      await ctx.model.SysMenu.destroy({
        where: { menu_id: menuIds },
        transaction,
      });

      await transaction.commit();

      ctx.body = {
        code: 200,
        message: '删除成功',
      };
    } catch (error) {
      await transaction.rollback();
      ctx.logger.error('删除菜单及关联记录失败:', error);
      ctx.body = {
        code: 500,
        message: '删除失败，服务器内部错误',
      };
    }
  }
}

module.exports = SysMenuController;
