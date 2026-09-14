'use strict';

const Controller = require('egg').Controller;

class AdminOuterAuthController extends Controller {
  // 登录接口
  async login() {
    const { ctx, service } = this;
    // 收集登录相关的元数据，比如 IP 和 User-Agent，用于记录登录日志
    const meta = {
      ip: ctx.ip,
      userAgent: ctx.get('user-agent'),
      device: 1, // 默认PC
      browser: '未知',
      os: '未知',
    };

    // 复用之前的 adminUser 登录逻辑，该逻辑里已经统一查询了 sys_user 并做了相应校验
    const result = await service.adminOuterUser.login(ctx.request.body, meta);

    // 组装符合之前接口格式的返回值
    ctx.body = {
      code: 200,
      message: '登录成功',
      data: {
        token: result.accessToken, // 将 accessToken 返回给前端
        refreshToken: result.refreshToken,
      },
    };
  }

  // 退出登录接口
  async logout() {
    const { ctx } = this;
    ctx.body = {
      code: 200,
      message: '退出成功',
      data: null,
    };
  }

  // 刷新 token 接口（如果有专门的 admin_outer 刷新逻辑，可以在此处实现；
  // 但之前路由中写的是 controller.common.auth.refresh，建议保持一致）
  async refresh() {
    const { ctx, app } = this;
    const { refreshToken } = ctx.request.body;

    if (!refreshToken) {
      ctx.throw(401, '缺少 refreshToken');
    }

    try {
      const decoded = app.jwt.verify(refreshToken, app.config.jwt.secret);
      if (!decoded.isRefresh || decoded.type !== 'admin_outer') {
        ctx.throw(401, '无效的 refreshToken');
      }

      // 签发新的 accessToken
      const newAccessToken = app.jwt.sign(
        { adminOuterId: decoded.adminOuterId, type: 'admin_outer' },
        app.config.jwt.secret,
        { expiresIn: app.config.jwt.expiresIn },
      );

      ctx.body = {
        code: 200,
        message: '刷新成功',
        data: {
          token: newAccessToken,
        },
      };
    } catch (err) {
      ctx.throw(401, 'refreshToken 已过期或无效');
    }
  }

  // 获取当前登录用户信息
  async current() {
    const { ctx } = this;
    const adminOuter = ctx.state.adminOuter;
    if (!adminOuter) {
      ctx.throw(401, '未登录');
    }

    const { user_id, user_type } = adminOuter;
    let permissions = [];
    let roles = [];

    // 根据规范：查询 sys_user_role -> role_id -> role_key, sys_role_menu -> menu_id -> perm_key
    // 只有 A/B 端 (user_type = 1/2/3) 才走权限体系
    if ([ 1, 2, 3 ].includes(user_type)) {
      // 1. 获取用户绑定的角色 ID
      const userRoles = await ctx.model.SysUserRole.findAll({
        where: { user_id },
        attributes: [ 'role_id' ],
      });
      let roleIds = userRoles.map(ur => ur.role_id);

      // [兜底策略]：如果在 sys_user_role 表中没有分配角色
      if (roleIds.length === 0) {
        if (user_type === 2) roleIds = [ 2 ]; // 店长
        if (user_type === 3) roleIds = [ 3 ]; // 业务员
      }

      if (roleIds.length > 0) {
        // 2. 获取角色 key (如 shop_owner, shop_salesman)
        const sysRoles = await ctx.model.SysRole.findAll({
          where: { role_id: { [ctx.app.Sequelize.Op.in]: roleIds } },
          attributes: [ 'role_code' ],
        });
        roles = sysRoles.map(r => r.role_code).filter(c => !!c);

        // 3. 获取角色关联的菜单 ID
        const roleMenus = await ctx.model.SysRoleMenu.findAll({
          where: { role_id: { [ctx.app.Sequelize.Op.in]: roleIds } },
          attributes: [ 'menu_id' ],
        });
        const menuIds = roleMenus.map(rm => rm.menu_id);

        if (menuIds.length > 0) {
          // 4. 查询关联的菜单，过滤出按钮级别
          const btns = await ctx.model.SysMenu.findAll({
            where: {
              menu_id: { [ctx.app.Sequelize.Op.in]: menuIds },
              enable: 1,
              api_tag: 'outer',
              perms: { [ctx.app.Sequelize.Op.ne]: null, [ctx.app.Sequelize.Op.ne]: '' },
            },
            attributes: [ 'perms' ],
          });
          permissions = btns.map(m => m.perms);
        } else {
          // 终极兜底：如果连角色都没配置任何菜单权限（如刚创建的店长角色），为了避免白屏，返回所有外端权限
          const allBtns = await ctx.model.SysMenu.findAll({
            where: {
              api_tag: 'outer',
              enable: 1,
              perms: { [ctx.app.Sequelize.Op.ne]: null, [ctx.app.Sequelize.Op.ne]: '' },
            },
            attributes: [ 'perms' ],
          });
          permissions = allBtns.map(m => m.perms);
        }
      }
    }

    // 移除中间件挂载的多余字段
    delete adminOuter.adminOuterId;
    delete adminOuter.role_id; // role_id 已不再直接使用，通过 sys_user_role 查

    // 从 sys_user 表中查询最新的 invite_code
    const userInfo = await ctx.model.SysUser.findOne({
      where: { user_id },
      attributes: [ 'invite_code' ],
    });

    // 追加 roles 和 permissions
    adminOuter.roles = roles;
    adminOuter.permissions = [ ...new Set(permissions) ];
    adminOuter.invite_code = userInfo ? userInfo.invite_code : null;

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: adminOuter,
    };
  }

  // 获取动态菜单路由 (仅B端调用)
  async getMenu() {
    const { ctx } = this;
    const adminOuter = ctx.state.adminOuter;
    if (!adminOuter) {
      ctx.throw(401, '未登录');
    }

    const { user_id, user_type } = adminOuter;
    let menuIds = [];

    // B端获取动态路由：user_id -> sys_user_role -> role_id -> sys_role_menu -> menu_id -> sys_menu
    const userRoles = await ctx.model.SysUserRole.findAll({
      where: { user_id },
      attributes: [ 'role_id' ],
    });
    let roleIds = userRoles.map(ur => ur.role_id);

    // [兜底策略]：如果角色为空或未绑定角色，根据 user_type 赋予默认角色
    if (roleIds.length === 0) {
      if (user_type === 2) roleIds = [ 2 ]; // 店长
      if (user_type === 3) roleIds = [ 3 ]; // 业务员
    }

    if (roleIds.length > 0) {
      const roleMenus = await ctx.model.SysRoleMenu.findAll({
        where: { role_id: { [ctx.app.Sequelize.Op.in]: roleIds } },
        attributes: [ 'menu_id' ],
      });
      menuIds = roleMenus.map(rm => rm.menu_id);
    }

    // 查询外端的所有启用菜单 (状态由 enable 字段控制，1正常0停用)
    // 根据规范：过滤出 menu_type=1 和 menu_type=2（目录和菜单），过滤掉 menu_type=3（按钮）
    const where = {
      enable: 1,
      menu_type: { [ctx.app.Sequelize.Op.in]: [ 1, 2 ] },
      api_tag: 'outer',
    };

    if (menuIds.length > 0) {
      where.menu_id = { [ctx.app.Sequelize.Op.in]: menuIds };
    } else {
      // 终极兜底：如果连角色都没配置任何菜单权限（如刚创建的店长角色），为了避免左侧菜单空白，展示所有外端菜单
      // 也就是不加上 menu_id 的限制条件，直接查所有 api_tag='outer' 的菜单
    }

    const menus = await ctx.model.SysMenu.findAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'menu_id', 'ASC' ]],
    });

    // 构建树形结构
    const buildTree = (menusList, parentId = 0) => {
      const tree = [];
      for (const menu of menusList) {
        if (Number(menu.parent_id) === Number(parentId)) {
          const item = menu.toJSON();
          item.id = item.menu_id;
          item.name = item.menu_name;
          item.path = item.route_path || '';
          item.type = item.menu_type;
          item.status = item.enable;
          item.permission = item.perms || '';
          item.icon = item.icon || '';
          item.visible = 0;
          item.is_frame = menu.is_frame || 1;
          item.is_cache = menu.is_cache || 0;
          item.component = item.component || '';

          const children = buildTree(menusList, menu.menu_id);
          if (children.length > 0) {
            item.children = children;
          }
          tree.push(item);
        }
      }
      return tree;
    };

    const treeData = buildTree(menus, 0);

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: treeData,
    };
  }
  /**
   * TEMPORARY: Create Outer Admin User (REMOVE AFTER USE)
   */
  async createOuterAdminUser() {
    const { ctx, service } = this;
    const { username, password } = ctx.request.body;

    ctx.assert(username, 422, '账号不能为空');
    ctx.assert(password, 422, '密码不能为空');

    // Check if user already exists
    const existingUser = await ctx.model.SysUser.findOne({ where: { username, user_type: 2 } });
    if (existingUser) {
      ctx.body = {
        code: 200,
        message: 'B端店长账号已存在',
        data: existingUser.toJSON(),
      };
      return;
    }

    const hashedPassword = await ctx.genHash(password);

    // Create a dummy shop first
    const shop = await ctx.model.Shop.create({
      shop_no: 'SHOP' + Date.now(),
      shop_name: '测试店铺',
      domain: 'test.com',
      status: 1,
    });

    const user = await ctx.model.SysUser.create({
      username,
      password: hashedPassword,
      user_type: 2, // B端店长
      status: 1,
      nickname: username,
      shop_id: shop.shop_id,
    });

    ctx.body = {
      code: 200,
      message: 'B端店长账号创建成功',
      data: user.toJSON(),
    };
  }
}

module.exports = AdminOuterAuthController;
