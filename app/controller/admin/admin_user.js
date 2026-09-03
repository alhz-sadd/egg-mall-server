'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-账号与权限
 * 管理端管理员控制器
 */
class AdminUserController extends Controller {
  /**
   * 解析用户代理信息，获取设备、浏览器和操作系统
   * @param {string} userAgent 用户代理字符串
   * @return {Object} 设备、浏览器和操作系统信息
   */
  parseUserAgent(userAgent) {
    if (!userAgent) {
      return { device: '未知设备', browser: '未知浏览器', os: '未知系统' };
    }
    const ua = userAgent.toLowerCase();
    let device = 'PC';
    if (/mobile|android|iphone|ipad|ipod/.test(ua)) {
      device = 'Mobile';
    }

    let browser = '其他浏览器';
    if (/chrome/.test(ua) && !/edge/.test(ua)) browser = 'Chrome';
    else if (/firefox/.test(ua)) browser = 'Firefox';
    else if (/safari/.test(ua) && !/chrome/.test(ua)) browser = 'Safari';
    else if (/edge/.test(ua)) browser = 'Edge';
    else if (/msie|trident/.test(ua)) browser = 'IE';

    let os = '其他系统';
    if (/windows nt 10/.test(ua)) os = 'Windows 10';
    else if (/windows nt 6.3/.test(ua)) os = 'Windows 8.1';
    else if (/windows nt 6.2/.test(ua)) os = 'Windows 8';
    else if (/windows nt 6.1/.test(ua)) os = 'Windows 7';
    else if (/windows nt/.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/.test(ua)) os = 'macOS';
    else if (/iphone|ipad|ipod/.test(ua)) os = 'iOS';
    else if (/android/.test(ua)) os = 'Android';
    else if (/linux/.test(ua)) os = 'Linux';

    return { device, browser, os };
  }

  /**
   * 获取登录环境元信息
   * @return {Object} 登录环境信息
   */
  getLoginMeta() {
    const { ctx } = this;
    const ip = ctx.ip || ctx.request.ip || '127.0.0.1';
    const userAgent = ctx.get('user-agent') || '';
    const { device, browser, os } = this.parseUserAgent(userAgent);

    return {
      ip,
      location: '未知',
      device,
      browser,
      os,
    };
  }

  /**
   * 记录操作日志
   * @param {string} module 模块
   * @param {string} action 动作
   * @param {string} description 描述
   * @param {number} status 状态
   * @param {number} duration 消耗时间（毫秒）
   */
  async recordOperation(module, action, description, status = 1, duration = 0) {
    const { ctx, service } = this;
    const admin = ctx.state.admin || {};

    await service.adminUser.recordOperationLog({
      admin_id: admin.adminId || null,
      username: admin.username || '',
      module,
      action,
      description,
      ip: ctx.ip || '127.0.0.1',
      location: '未知',
      duration,
      status,
    });
  }

  /**
   * @summary 管理员登录
   * @description 管理员登录并记录登录日志（IP、地点、设备、浏览器、耗时、操作结果）
   * @router post /api/admin/login
   * @request body AdminLoginRequest *body 登录信息
   * @response 200 ApiResponse 登录成功
   */
  async login() {
    const { ctx, service } = this;
    const meta = this.getLoginMeta();

    const result = await service.adminUser.login(ctx.request.body, meta);

    ctx.body = {
      code: 200,
      message: '登录成功',
      data: result,
    };
  }

  /**
   * @summary 获取谷歌验证码二维码 (仅生成不绑定)
   * @description 用于生成谷歌验证码密钥和二维码。注意：此接口仅生成，不直接绑定，密钥存入缓存。
   * @router post /api/admin/generate-google-auth
   * @request body GenerateGoogleAuthRequest *body 验证信息
   * @response 200 ApiResponse 包含二维码
   */
  async generateGoogleAuth() {
    const { ctx, app } = this;
    const { username, password } = ctx.request.body;

    ctx.assert(username, 422, '为了您的账号安全，操作谷歌验证码需要验证账号');
    ctx.assert(password, 422, '为了您的账号安全，操作谷歌验证码需要验证登录密码');

    const admin = await ctx.model.AdminUser.findOne({ where: { username } });
    ctx.assert(admin, 401, '管理员账号不存在');

    // 验证当前登录密码
    const match = await ctx.compare(password, admin.password);
    if (!match) {
      ctx.throw(422, '登录密码错误，无法生成');
    }

    if (admin.google_code) {
      ctx.throw(422, '该账号已绑定谷歌验证码，如需重新绑定请联系超级管理员');
    }

    const speakeasy = require('speakeasy');
    const QRCode = require('qrcode');

    const secret = speakeasy.generateSecret({
      name: `后台管理系统(${admin.username})`,
    });

    // 将密钥存入 Redis，有效期 5 分钟 (300秒)
    await app.redis.set(`google_auth_secret_${username}`, secret.base32, 'EX', 300);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    ctx.body = {
      code: 200,
      message: '生成成功，请进行扫码并验证绑定',
      data: {
        qrCodeUrl,
      },
    };
  }

  /**
   * @summary 绑定谷歌验证码
   * @description 从缓存取出密钥并校验6位验证码是否正确，正确则真正将密钥绑定到账号
   * @router post /api/admin/bindGoogle
   * @request body BindGoogleAuthRequest *body 绑定参数
   * @response 200 ApiResponse 绑定成功
   */
  async bindGoogle() {
    const { ctx, app } = this;
    const { userName, code } = ctx.request.body;

    ctx.assert(userName, 422, '请提供要绑定的用户账号(userName)');
    ctx.assert(code, 422, '请提供谷歌验证器上的6位验证码(code)');

    const admin = await ctx.model.AdminUser.findOne({ where: { username: userName } });
    ctx.assert(admin, 401, '管理员账号不存在');

    if (admin.google_code) {
      ctx.throw(422, '该账号已绑定谷歌验证码，无需重复绑定');
    }

    // 从 Redis 中取出生成的 secret
    const secret = await app.redis.get(`google_auth_secret_${userName}`);
    if (!secret) {
      ctx.throw(422, '验证码已过期或未获取，请重新获取二维码');
    }

    const speakeasy = require('speakeasy');

    // 验证前端传来的验证码是否与该密钥匹配
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1, // 允许时间上有一定偏差 (前后 30 秒)
    });

    if (!verified) {
      // 验证失败，丢弃缓存
      await app.redis.del(`google_auth_secret_${userName}`);
      ctx.throw(422, '谷歌验证码错误，绑定失败，请重新获取二维码');
    }

    // 验证通过，将密钥正式存入数据库，完成绑定
    await admin.update({ google_code: secret });

    // 绑定成功后清除缓存
    await app.redis.del(`google_auth_secret_${userName}`);

    ctx.body = {
      code: 200,
      message: '谷歌验证码绑定成功',
      data: null,
    };
  }

  /**
   * @summary 管理员退出登录
   * @description 退出登录并记录操作日志（前端需清除本地 token）
   * @router post /api/admin/logout
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 退出成功
   */
  async logout() {
    const { ctx } = this;
    const admin = ctx.state.admin || {};
    const startTime = Date.now();

    await this.recordOperation('账号管理', '退出登录', `管理员退出登录：${admin.username || ''}`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '退出成功',
      data: null,
    };
  }

  /**
   * @summary 获取个人信息
   * @description 管理端获取当前登录用户基本信息
   * @router get /api/admin/system/user/profile
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 个人信息
   */
  async profile() {
    const { ctx, service } = this;
    const { adminId } = ctx.state.admin;
    const admin = await service.adminUser.detail(adminId);

    let roleName = '';
    if (admin.role === 1) roleName = '超级管理员';
    else if (admin.role === 2) roleName = '业务员';

    ctx.body = {
      code: 200,
      msg: '操作成功',
      data: {
        user: {
          userId: admin.id,
          userName: admin.username,
          nickName: admin.nickname,
          email: admin.email || '',
          phonenumber: admin.phone || '',
          sex: admin.gender === 1 ? '1' : (admin.gender === 2 ? '2' : '0'),
          avatar: '',
          remark: admin.remark || '',
          admin: admin.role === 1 || admin.username === '333333',
          roleId: admin.role,
          isBindGoogle: !!admin.google_code, // 返回是否绑定了谷歌验证码
        },
        roleGroup: roleName,
        postGroup: '',
      },
    };
  }

  /**
   * @summary 修改基础资料
   * @description 修改当前登录用户的昵称、手机号、邮箱、性别等
   * @router put /api/admin/system/user/profile
   * @request header string Authorization Bearer admin token
   * @request body UpdateAdminProfileRequest *body 基础资料
   * @response 200 ApiResponse 修改成功
   */
  async updateProfile() {
    const { ctx } = this;
    const { adminId } = ctx.state.admin;
    const { nickName, phonenumber, email, sex } = ctx.request.body;

    const admin = await ctx.model.AdminUser.findByPk(adminId);
    if (!admin) {
      ctx.throw(404, '用户不存在');
    }

    const updateData = {};
    if (nickName !== undefined) updateData.nickname = nickName;
    if (phonenumber !== undefined) updateData.phone = phonenumber;
    if (email !== undefined) updateData.email = email;
    if (sex !== undefined) updateData.gender = Number(sex);

    await admin.update(updateData);

    // 同步更新关联用户表
    const linkedUser = await ctx.model.User.findOne({ where: { admin_id: adminId } });
    if (linkedUser) {
      const userUpdateData = {};
      if (nickName !== undefined) userUpdateData.user_nickname = nickName;
      await linkedUser.update(userUpdateData);
    }

    ctx.body = {
      code: 200,
      msg: '修改成功',
    };
  }

  /**
   * @summary 修改登录密码
   * @description 修改当前登录用户的登录密码
   * @router put /api/admin/system/user/profile/updatePwd
   * @request header string Authorization Bearer admin token
   * @request body UpdateAdminPwdRequest *body 密码资料
   * @response 200 ApiResponse 修改成功
   */
  async updatePwd() {
    const { ctx } = this;
    const { adminId } = ctx.state.admin;

    // 兼容 Body 和 Query 传参（RuoYi 前端通常通过 Query 传参且不传 confirmPassword）
    const oldPassword = ctx.request.body.oldPassword || ctx.query.oldPassword;
    const newPassword = ctx.request.body.newPassword || ctx.query.newPassword;
    const confirmPassword = ctx.request.body.confirmPassword || ctx.query.confirmPassword || newPassword;

    ctx.assert(oldPassword, 422, '旧密码不能为空');
    ctx.assert(newPassword, 422, '新密码不能为空');
    ctx.assert(confirmPassword, 422, '确认密码不能为空');
    if (newPassword !== confirmPassword) {
      ctx.throw(422, '两次输入的新密码不一致');
    }

    const admin = await ctx.model.AdminUser.findByPk(adminId);
    if (!admin) {
      ctx.throw(404, '用户不存在');
    }

    const match = await ctx.compare(oldPassword, admin.password);
    if (!match) {
      ctx.throw(422, '修改密码失败，旧密码错误');
    }

    const hashedPassword = await ctx.genHash(newPassword);
    await admin.update({ password: hashedPassword });

    // 同步修改关联用户表的密码 (如果有)
    const linkedUser = await ctx.model.User.findOne({ where: { admin_id: adminId } });
    if (linkedUser) {
      await linkedUser.update({ user_password: hashedPassword });
    }

    ctx.body = {
      code: 200,
      msg: '密码修改成功',
    };
  }

  /**
   * @summary 获取当前管理员菜单权限
   * @description 返回当前登录管理员的菜单权限列表
   * @router get /api/admin/menus
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 菜单权限
   */
  async menus() {
    const { ctx, service } = this;
    const { adminId } = ctx.state.admin;

    const menus = await service.adminUser.getMenus(adminId);

    // 如果是 333333，直接给前端最高权限标识符
    const admin = await ctx.model.AdminUser.findByPk(adminId);
    if (admin && admin.username === '333333') {
      if (!menus.includes('*:*:*')) {
        menus.push('*:*:*');
      }
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: { menus },
    };
  }

  /**
   * @summary 获取当前管理员详情信息
   * @description 兼容 RuoYi 架构前端的 getInfo 接口
   * @router get /api/admin/getInfo
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 管理员详细信息
   */
  async getInfo() {
    const { ctx, service } = this;
    const { adminId } = ctx.state.admin;

    const admin = await service.adminUser.detail(adminId);
    const permissions = await service.adminUser.getMenus(adminId);

    if (admin && admin.username === '333333') {
      if (!permissions.includes('*:*:*')) {
        permissions.push('*:*:*');
      }
    }

    let roleName = '';
    if (admin.role === 1) roleName = 'admin';
    else if (admin.role === 2) roleName = 'salesperson';

    ctx.body = {
      msg: '操作成功',
      code: 200,
      permissions,
      roles: [ roleName ],
      user: {
        createBy: 'admin',
        createTime: admin.created_at,
        updateBy: null,
        updateTime: admin.updated_at,
        remark: admin.remark || '',
        userId: admin.id,
        userName: admin.username,
        nickName: admin.nickname,
        email: admin.email || '',
        phonenumber: admin.phone || '',
        sex: admin.gender === 1 ? '1' : (admin.gender === 2 ? '2' : '0'),
        avatar: '',
        status: admin.status === 1 ? '0' : '1', // 状态:0正常 1停用
        admin: admin.role === 1 || admin.username === '333333',
        loginIp: admin.last_login_ip,
        loginDate: admin.last_login_time,
        roles: [],
      },
      status: true,
    };
  }

  /**
   * @summary 获取用户路由菜单接口
   * @description 兼容 RuoYi 架构前端的 getRouters 接口，返回左侧菜单树
   * @router get /api/admin/getRouters
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 路由树
   */
  async getRouters() {
    const { ctx, service } = this;
    const { adminId } = ctx.state.admin;

    // 1. 拿到当前登录的用户信息，查询所属角色
    const admin = await ctx.model.AdminUser.findByPk(adminId);
    if (!admin) {
      ctx.throw(401, '用户不存在');
    }

    // 2. 查出角色勾选过的所有菜单记录 (超级管理员 333333 或 role=1 默认获取全部)
    let menus = [];
    if (admin.username === '333333' || admin.role === 1) {
      menus = await ctx.model.Menu.findAll({
        order: [[ 'sort', 'ASC' ], [ 'id', 'ASC' ]],
      });
    } else {
      // 优先从 role_menu 表查出该角色勾选的菜单
      const roleMenus = await ctx.model.RoleMenu.findAll({
        where: { role_id: admin.role },
        attributes: [ 'menu_id' ],
      });
      const menuIds = roleMenus.map(rm => rm.menu_id);

      const allMenus = await ctx.model.Menu.findAll({
        order: [[ 'sort', 'ASC' ], [ 'id', 'ASC' ]],
      });

      if (menuIds.length > 0) {
        menus = allMenus.filter(m => menuIds.includes(m.id));
      } else {
        // 兼容老逻辑
        const permissionNames = await service.adminUser.getMenus(adminId);
        if (permissionNames.includes('*:*:*')) {
          menus = allMenus;
        } else {
          menus = allMenus.filter(m => m.permission && permissionNames.includes(m.permission));
        }
      }

      // 补全父节点：如果某个子节点被选中，其父节点也应在列表中
      const menuIdSet = new Set(menus.map(m => m.id));
      let added = true;
      while (added) {
        added = false;
        // 注意：menus 在循环中会变长，需要重新遍历
        for (let i = 0; i < menus.length; i++) {
          const m = menus[i];
          if (m.parent_id && m.parent_id !== 0 && !menuIdSet.has(m.parent_id)) {
            const parentMenu = allMenus.find(am => am.id === m.parent_id);
            if (parentMenu) {
              menus.push(parentMenu);
              menuIdSet.add(parentMenu.id);
              added = true;
            }
          }
        }
      }

      // 重新排序
      menus.sort((a, b) => (a.sort - b.sort) || (a.id - b.id));
    }

    // 3. 过滤掉按钮，只取目录(type=0)和菜单(type=1)
    menus = menus.filter(m => m.type === 0 || m.type === 1);

    // 4. 组装成前端需要的树形路由结构
    const buildRouterTree = (list, parentId = null) => {
      const tree = [];
      for (const item of list) {
        if (item.parent_id === parentId) {
          const children = buildRouterTree(list, item.id);

          const routerNode = {
            name: item.name || '',
            path: item.path || '',
            hidden: item.hidden || false,
            component: item.component || 'Layout',
            meta: {
              title: (item.meta && item.meta.title) ? item.meta.title : item.name,
              icon: (item.meta && item.meta.icon) ? item.meta.icon : '',
              noCache: !item.keep_alive,
              link: item.is_ext ? item.path : null,
            },
          };

          if (item.redirect) {
            routerNode.redirect = item.redirect;
          }
          if (item.alwaysShow) {
            routerNode.alwaysShow = true;
          }

          if (children.length > 0) {
            routerNode.children = children;
          }

          tree.push(routerNode);
        }
      }
      return tree;
    };

    const routerTree = buildRouterTree(menus);

    ctx.body = {
      msg: '操作成功',
      code: 200,
      data: routerTree,
    };
  }

  /**
   * @summary 获取当前登录管理员信息
   * @description 返回当前登录管理员信息（含菜单权限）
   * @router get /api/admin/current
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 管理员信息
   */
  async current() {
    const { ctx, service } = this;
    const { adminId } = ctx.state.admin;

    const admin = await service.adminUser.detail(adminId);
    const menus = await service.adminUser.getMenus(adminId);

    // 查询与当前管理员对应的用户记录，获取其 user_invite_code
    // 管理员在 users 表中有一条对应的记录（username 与管理员用户名相同）
    let user_invite_code = null;
    const userRecord = await ctx.model.User.findOne({
      where: { user_name: admin.username, user_status: 0 },
      attributes: [ 'user_invite_code' ],
      raw: true,
    });
    if (userRecord && userRecord.user_invite_code) {
      user_invite_code = userRecord.user_invite_code;
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        id: admin.id,
        admin_code: admin.admin_code,
        user_invite_code,
        username: admin.username,
        nickname: admin.nickname,
        role: admin.role,
        status: admin.status,
        menus,
      },
    };
  }

  /**
   * @summary 获取管理员列表
   * @description 管理员可查看全部账号
   * @router get /api/admin/users
   * @request header string Authorization Bearer admin token
   * @request query string keyword 关键词
   * @request query integer role 角色：1超级管理员 2业务员
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 管理员列表
   */
  async index() {
    const { ctx, service } = this;
    const { keyword, role, page, page_size } = ctx.query;

    const result = await service.adminUser.list({ keyword, role, page, page_size }, ctx.state.admin.role);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取管理员详情
   * @description 管理员可查看任意账号
   * @router get /api/admin/users/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 管理员ID
   * @response 200 ApiResponse 管理员详情
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    const admin = await service.adminUser.detail(id);

    ctx.body = {
      code: 200,
      message: 'success',
      data: admin,
    };
  }

  /**
   * @summary 创建管理员账号
   * @description 管理员可创建任意角色账号
   * @router post /api/admin/users
   * @request header string Authorization Bearer admin token
   * @request body AdminUserRequest *body 管理员信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const { role } = ctx.state.admin;
    const startTime = Date.now();

    const admin = await service.adminUser.create(ctx.request.body, role);
    await this.recordOperation('管理员管理', '新增', `创建管理员账号：${admin.username}`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: admin,
    };
  }

  /**
   * @summary 更新管理员账号
   * @description 管理员可更新任意账号
   * @router put /api/admin/users/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 管理员ID
   * @request body AdminUserRequest *body 管理员信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const startTime = Date.now();

    const admin = await service.adminUser.update(id, ctx.request.body, ctx.state.admin.role);
    await this.recordOperation('管理员管理', '修改', `更新管理员账号：${admin.username}`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: admin,
    };
  }

  /**
   * @summary 删除管理员账号
   * @description 管理员可删除任意账号
   * @router delete /api/admin/users/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 管理员ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const startTime = Date.now();

    await service.adminUser.destroy(id, ctx.state.admin.role);
    await this.recordOperation('管理员管理', '删除', `删除管理员ID：${id}`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }

  /**
   * @summary 管理员自行解绑谷歌验证码
   * @description 通过输入密码和当前有效的谷歌验证码来解除绑定
   * @router post /api/admin/unbindGoogle
   * @request header string Authorization Bearer admin token
   * @request body UnbindSelfGoogleAuthRequest *body 验证信息
   * @response 200 ApiResponse 解绑成功
   */
  async unbindSelfGoogle() {
    const { ctx } = this;
    const adminId = ctx.state.admin.adminId;
    const { username, password } = ctx.request.body;

    ctx.assert(username, 422, '请提供当前管理员的登录账号(username)');
    ctx.assert(password, 422, '为了您的账号安全，解绑需要验证登录密码');

    const admin = await ctx.model.AdminUser.findByPk(adminId);
    ctx.assert(admin, 401, '管理员账号不存在');

    if (admin.username !== username) {
      ctx.throw(422, '提供的账号与当前登录账号不一致');
    }

    if (!admin.google_code) {
      ctx.throw(422, '您当前未绑定谷歌验证码，无需解绑');
    }

    // 1. 验证登录密码
    const match = await ctx.compare(password, admin.password);
    if (!match) {
      ctx.throw(422, '登录密码错误，无法解绑');
    }

    // 2. 验证通过，清空 google_code
    await admin.update({ google_code: null });

    // 记录操作日志
    await this.recordOperation('账号管理', '解绑谷歌验证', `管理员自行解绑谷歌验证码：${admin.username}`, 1, 0);

    ctx.body = {
      code: 200,
      message: '解绑成功，下次登录将不再需要验证码',
      data: null,
    };
  }

  /**
   * @summary 重置(解绑)指定管理员的谷歌验证码
   * @description 仅限上级操作，将目标用户的 google_code 设为空
   * @router post /api/admin/users/:id/reset-google-auth
   * @request header string Authorization Bearer admin token
   * @request path integer *id 管理员ID
   * @response 200 ApiResponse 重置成功
   */
  async resetGoogleAuth() {
    const { ctx } = this;
    const { id } = ctx.params;
    const startTime = Date.now();

    const admin = await ctx.model.AdminUser.findByPk(id);
    if (!admin) {
      ctx.throw(404, '管理员不存在');
    }

    await admin.update({ google_code: null });
    await this.recordOperation('管理员管理', '重置谷歌验证码', `重置管理员ID：${id} 的谷歌验证码`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '重置谷歌验证码成功',
      data: null,
    };
  }

  /**
   * @summary 重置指定下级管理员的登录密码
   * @description 仅限上级操作，重置目标用户的登录密码
   * @router post /api/admin/users/:id/reset-password
   * @request header string Authorization Bearer admin token
   * @request path integer *id 管理员ID
   * @request body ResetAdminPwdRequest *body 重置密码信息
   * @response 200 ApiResponse 重置成功
   */
  async resetPassword() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const { password } = ctx.request.body;
    const operatorRole = ctx.state.admin.role;
    const startTime = Date.now();

    const result = await service.adminUser.resetPassword(id, password, operatorRole);
    await this.recordOperation('管理员管理', '重置密码', `重置管理员账号：${result.username} 的登录密码`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '重置登录密码成功',
      data: result,
    };
  }

  /**
   * @summary 获取登录日志列表
   * @description 获取管理员登录日志，支持账号、状态、IP地址、登录时间区间筛选
   * @router get /api/admin/login-logs
   * @request header string Authorization Bearer admin token
   * @request query string userName 管理员账号
   * @request query integer status 登录状态：0登录成功 1登录失败
   * @request query string ipaddr 登录IP地址
   * @request query string start_time 开始时间
   * @request query string end_time 结束时间
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 登录日志列表
   */
  async loginLogs() {
    const { ctx, service } = this;
    // 商家端（admin-outer）只显示登录店铺自己的数据
    const adminId = ctx.state.admin ? ctx.state.admin.adminId : undefined;
    const result = await service.adminUser.loginLogs(ctx.query, adminId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 批量删除登录日志
   * @description 根据ID数组批量删除登录日志
   * @router delete /api/admin/login-logs/batch
   * @request header string Authorization Bearer admin token
   * @request body LoginLogBatchDeleteRequest *body 批量删除参数
   * @response 200 ApiResponse 删除成功
   */
  async batchDestroyLoginLogs() {
    const { ctx, service } = this;
    await service.adminUser.batchDestroyLoginLogs(ctx.request.body.ids);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }

  /**
   * @summary 清空登录日志
   * @description 清空所有管理员登录日志
   * @router delete /api/admin/login-logs/clear
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 清空成功
   */
  async clearLoginLogs() {
    const { ctx, service } = this;
    await service.adminUser.clearLoginLogs();

    ctx.body = {
      code: 200,
      message: '清空成功',
      data: null,
    };
  }
}

module.exports = AdminUserController;
