'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-菜单管理
 */
class MenuController extends Controller {
  /**
   * @summary 获取菜单列表
   * @description 获取所有的前端路由菜单列表
   * @router get /system/menu/getAllMenuTree
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 菜单列表
   */
  async getAllMenuTree() {
    const { ctx } = this;

    const menus = await ctx.model.Menu.findAll({
      order: [[ 'id', 'ASC' ]],
    });

    const buildTree = (menus, parentId = null) => {
      const tree = [];
      for (const menu of menus) {
        if (menu.parent_id === parentId) {
          const children = buildTree(menus, menu.id);
          const item = menu.toJSON();

          // 补充默认字段
          item.sort = item.sort ?? 0;
          item.type = item.type ?? 1;
          item.is_ext = item.is_ext ?? false;
          item.keep_alive = item.keep_alive ?? true;
          item.status = item.status ?? true;
          item.permission = item.permission || '';

          // 兼容前端不同的字段名 (双向绑定)
          item.is_frame = item.is_ext ? 0 : 1;
          item.is_cache = item.keep_alive ? 0 : 1;
          item.visible = item.hidden ? 1 : 0;
          item.perms = item.permission;
          // 若前端需要数字类型状态
          if (typeof item.status === 'boolean') {
            item.status = item.status ? 0 : 1;
          }

          if (children.length > 0) {
            item.children = children;
          }
          tree.push(item);
        }
      }
      return tree;
    };

    const data = buildTree(menus);

    ctx.body = {
      code: 200,
      msg: '操作成功',
      data,
    };
  }

  /**
   * @summary 新增菜单
   * @description 新增一个菜单项
   * @router post /system/menu
   * @request body CreateMenuRequest *body
   * @response 200 ApiResponse 新增结果
   */
  async create() {
    const { ctx } = this;
    const { body } = ctx.request;

    // 参数提取和白名单过滤
    const {
      parent_id, name, path, component, redirect, hidden, alwaysShow, meta,
      sort, type, is_ext, keep_alive, status, permission,
      is_frame, is_cache, perms, visible,
    } = body;

    // 兼容前端不同的字段名
    let finalPermission = '';
    if (perms !== undefined) {
      finalPermission = perms;
    } else if (permission !== undefined) {
      finalPermission = permission;
    }

    const finalIsExt = is_ext !== undefined ? is_ext : (is_frame !== undefined ? is_frame === 0 : false);
    const finalKeepAlive = keep_alive !== undefined ? keep_alive : (is_cache !== undefined ? is_cache === 0 : true);
    const finalHidden = hidden !== undefined ? hidden : (visible !== undefined ? visible === 1 : false);

    // 处理 status 的映射 (前端0是正常，1是停用；后端true是正常，false是停用)
    let finalStatus = true;
    if (typeof status === 'boolean') {
      finalStatus = status;
    } else if (typeof status === 'number') {
      finalStatus = status === 0;
    }

    // 校验必填项
    if (!name) {
      ctx.throw(400, '路由名称不能为空');
    }
    if (type !== 2 && type !== 3 && !path) {
      ctx.throw(400, '路由路径不能为空');
    }

    // 校验 parent_id
    if (parent_id) {
      const parent = await ctx.model.Menu.findByPk(parent_id);
      if (!parent) {
        ctx.throw(400, '父级菜单不存在');
      }
    }

    const menu = await ctx.model.Menu.create({
      parent_id: parent_id || null,
      name,
      path: path || '',
      component,
      redirect,
      hidden: finalHidden,
      alwaysShow: alwaysShow || false,
      meta: meta || {},
      sort: sort ?? 0,
      type: type ?? 1,
      is_ext: finalIsExt,
      keep_alive: finalKeepAlive,
      status: finalStatus,
      permission: finalPermission,
    });

    await menu.reload();
    const result = menu.toJSON();
    result.perms = result.permission;

    ctx.body = {
      code: 200,
      msg: '操作成功',
      data: result,
    };
  }

  /**
   * @summary 更新菜单
   * @description 更新指定ID的菜单项
   * @router put /system/menu/{id}
   * @request path integer *id 菜单ID
   * @request body UpdateMenuRequest *body
   * @response 200 ApiResponse 更新结果
   */
  async update() {
    const { ctx } = this;
    let { id } = ctx.params;
    const { body } = ctx.request;

    // 兼容从 body 获取 id
    if (!id && body.id) {
      id = body.id;
    }

    if (!id) {
      ctx.throw(400, '菜单ID不能为空');
    }

    const menu = await ctx.model.Menu.findByPk(id);
    if (!menu) {
      ctx.throw(404, '菜单不存在');
    }

    const {
      parent_id, name, path, component, redirect, hidden, alwaysShow, meta,
      sort, type, is_ext, keep_alive, status, permission,
      is_frame, is_cache, perms, visible,
    } = body;

    // 兼容前端不同的字段名
    let finalPermission = menu.permission;
    if (perms !== undefined) {
      finalPermission = perms;
    } else if (permission !== undefined) {
      finalPermission = permission;
    }

    const finalIsExt = is_ext !== undefined ? is_ext : (is_frame !== undefined ? is_frame === 0 : menu.is_ext);
    const finalKeepAlive = keep_alive !== undefined ? keep_alive : (is_cache !== undefined ? is_cache === 0 : menu.keep_alive);
    const finalHidden = hidden !== undefined ? hidden : (visible !== undefined ? visible === 1 : menu.hidden);

    // 处理 status 映射
    let finalStatus = menu.status;
    if (typeof status === 'boolean') {
      finalStatus = status;
    } else if (typeof status === 'number') {
      finalStatus = status === 0;
    }

    // 防止自己作为自己的父级
    if (parent_id && Number(parent_id) === Number(id)) {
      ctx.throw(400, '父级菜单不能是自己');
    }

    if (parent_id) {
      const parent = await ctx.model.Menu.findByPk(parent_id);
      if (!parent) {
        ctx.throw(400, '父级菜单不存在');
      }
    }

    await menu.update({
      parent_id: parent_id || null,
      name: name !== undefined ? name : menu.name,
      path: path !== undefined ? path : menu.path,
      component: component !== undefined ? component : menu.component,
      redirect: redirect !== undefined ? redirect : menu.redirect,
      hidden: finalHidden,
      alwaysShow: alwaysShow !== undefined ? alwaysShow : menu.alwaysShow,
      meta: meta !== undefined ? meta : menu.meta,
      sort: sort !== undefined ? sort : menu.sort,
      type: type !== undefined ? type : menu.type,
      is_ext: finalIsExt,
      keep_alive: finalKeepAlive,
      status: finalStatus,
      permission: finalPermission,
    });

    await menu.reload();
    const result = menu.toJSON();
    result.perms = result.permission;

    ctx.body = {
      code: 200,
      msg: '操作成功',
      data: result,
    };
  }

  /**
   * @summary 删除菜单
   * @description 删除指定ID的菜单项
   * @router delete /system/menu/{id}
   * @request path integer *id 菜单ID
   * @response 200 ApiResponse 删除结果
   */
  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    const menu = await ctx.model.Menu.findByPk(id);
    if (!menu) {
      ctx.throw(404, '菜单不存在');
    }

    // 检查是否存在子菜单
    const children = await ctx.model.Menu.findOne({ where: { parent_id: id } });
    if (children) {
      ctx.throw(400, '存在子菜单，不允许删除');
    }

    await menu.destroy();

    ctx.body = {
      code: 200,
      msg: '操作成功',
    };
  }

}

module.exports = MenuController;
