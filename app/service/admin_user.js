'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

/**
 * 管理员服务层
 */
class AdminUserService extends Service {
  /**
   * 管理员登录
   * @param {Object} payload 登录参数
   * @param {Object} meta 登录环境信息
   * @return {Object} token 及管理员信息
   */
  async login(payload, meta) {
    const { ctx } = this;
    const { username, password, googleCode } = payload;
    const { ip, location, device, browser, os } = meta;

    const startTime = Date.now();

    ctx.assert(username, 422, '账号不能为空');
    ctx.assert(password, 422, '密码不能为空');

    const admin = await ctx.model.AdminUser.findOne({ where: { username } });

    // 用户不存在
    if (!admin) {
      await this.recordLoginLog({
        admin_id: null,
        username,
        ip,
        location,
        device,
        browser,
        os,
        operation: '登录失败：用户不存在',
        status: 1,
        duration: Date.now() - startTime,
      });
      ctx.throw(422, '账号或密码错误');
    }

    // 账号已禁用
    if (admin.status !== 1) {
      await this.recordLoginLog({
        admin_id: admin.id,
        username,
        ip,
        location,
        device,
        browser,
        os,
        operation: '登录失败：账号已禁用',
        status: 1,
        duration: Date.now() - startTime,
      });
      ctx.throw(422, '账号已被禁用');
    }

    // 密码校验
    const match = await ctx.compare(password, admin.password);
    if (!match) {
      await this.recordLoginLog({
        admin_id: admin.id,
        username,
        ip,
        location,
        device,
        browser,
        os,
        operation: '登录失败：密码错误',
        status: 1,
        duration: Date.now() - startTime,
      });
      ctx.throw(422, '账号或密码错误');
    }

    // 谷歌验证码校验
    if (admin.google_code) {
      ctx.assert(googleCode, 422, '谷歌验证码不能为空');

      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: admin.google_code,
        encoding: 'base32',
        token: googleCode,
        window: 1,
      });

      if (!verified) {
        await this.recordLoginLog({
          admin_id: admin.id,
          username,
          ip,
          location,
          device,
          browser,
          os,
          operation: '登录失败：谷歌验证码错误',
          status: 1,
          duration: Date.now() - startTime,
        });
        ctx.throw(422, '谷歌验证码错误');
      }
    }

    // 更新最后登录信息
    await admin.update({
      last_login_ip: ip,
      last_login_time: new Date(),
    });

    await this.recordLoginLog({
      admin_id: admin.id,
      username,
      ip,
      location,
      device,
      browser,
      os,
      operation: '登录成功',
      status: 0,
      duration: Date.now() - startTime,
    });

    // 生成双 Token
    const accessToken = ctx.app.jwt.sign(
      { adminId: admin.id, role: admin.role, username: admin.username, type: 'admin' },
      ctx.app.config.jwt.secret,
      { expiresIn: ctx.app.config.jwt.expiresIn },
    );

    const refreshToken = ctx.app.jwt.sign(
      { adminId: admin.id, type: 'admin', isRefresh: true },
      ctx.app.config.jwt.secret,
      { expiresIn: payload.remember ? '30d' : ctx.app.config.jwt.refreshExpiresIn },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * 根据角色获取菜单权限
   * 优先从 role_menus 表查询对应的按钮权限 (type=2)
   * @param {number} role 角色
   * @return {Array<string>} 权限标识列表
   */
  async getMenusByRole(role) {
    const { ctx } = this;

    // 1. 从 role_menus 表查出该角色勾选的所有菜单 ID
    const roleMenus = await ctx.model.RoleMenu.findAll({
      where: { role_id: role },
      attributes: [ 'menu_id' ],
    });

    if (roleMenus.length > 0) {
      const menuIds = roleMenus.map(rm => rm.menu_id);

      // 2. 查询这些菜单中类型为按钮 (type=2) 且有权限标识的记录
      const menus = await ctx.model.Menu.findAll({
        where: {
          id: { [Op.in]: menuIds },
          type: 2,
          permission: { [Op.ne]: null },
        },
        attributes: [ 'permission' ],
      });

      if (menus.length > 0) {
        return [ ...new Set(menus.map(m => m.permission).filter(p => !!p)) ];
      }
    }

    // 3. 如果 role_menus 为空，尝试从 role_permissions 表查询（向后兼容）
    const permissionNames = await ctx.service.permission.getRolePermissionNames(role);
    if (permissionNames.length > 0) {
      return permissionNames;
    }

    // 默认权限
    const defaultMenus = {
      // 超级管理员：全部管理权限
      1: [
        'Dashboard',
        'System',
        'Log',
        'operation-log',
        'login-log',
        'Account',
        'account-supervisor',
        'account-salesperson',
        'Permission',
        'permission-admin',
        'permission-supervisor',
        'permission-salesperson',
        'Member',
        'member',
        'recharge-detail',
        'order-list',
        'fan-dedup',
        'Strategy',
        'strategy',
        'auth',
        'Finance',
        'recharge-list',
        'withdraw-list',
        'RechargeAddressMgmt',
        'Mall',
        'banner',
        'customer-service',
        'notice',
        'rule',
        'product',
        'task',
      ],
      // 业务员：会员/充值业务 + 自己的账号查询
      2: [
        'Dashboard',
        'Account',
        'account-salesperson',
        'Member',
        'member',
        'recharge-detail',
        'order-list',
        'fan-dedup',
        'Finance',
        'recharge-list',
        'withdraw-list',
        'RechargeAddressMgmt',
      ],
    };
    return defaultMenus[role] || defaultMenus[1];
  }

  /**
   * 获取当前管理员菜单
   * @param {number} adminId 管理员ID
   * @return {Array<string>} 菜单列表
   */
  async getMenus(adminId) {
    const { ctx } = this;
    const admin = await ctx.model.AdminUser.findByPk(adminId, {
      attributes: [ 'id', 'role', 'username' ],
    });
    if (!admin) {
      ctx.throw(404, '管理员不存在');
    }

    // 如果是超级管理员（用户 333333）或者角色为 1 的管理员，直接返回通配符 '*:*:*' 代表全部权限
    if (admin.role === 1 || admin.username === '333333') {
      return [ '*:*:*' ];
    }

    return await this.getMenusByRole(admin.role);
  }

  /**
   * 获取管理员列表
   * @param {Object} query 查询参数
   * @return {Object} 分页列表
   */
  async list(query = {}) {
    const { ctx } = this;
    const { keyword, role, status, page = 1, page_size = 10 } = query;

    const where = {};

    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    if (role) {
      const queryRole = Number(role);
      where.role = queryRole;
    }

    if (keyword) {
      where.username = { [Op.like]: `%${keyword}%` };
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.AdminUser.findAndCountAll({
      where,
      order: [[ 'id', 'DESC' ]],
      offset,
      limit,
    });

    // 查询上级信息并统一字段名
    const list = await Promise.all(rows.map(async admin => {
      const item = admin.toJSON ? admin.toJSON() : admin;
      const adminId = item.bind_admin_id;
      let admin_username = null;
      let admin_nickname = null;
      if (adminId) {
        const parent = await ctx.model.AdminUser.findByPk(adminId, {
          attributes: [ 'username', 'nickname' ],
          raw: true,
        });
        if (parent) {
          admin_username = parent.username;
          admin_nickname = parent.nickname;
        }
      }

      // 获取角色名称
      let role_name = '未知';
      const roleRecord = await ctx.model.Role.findOne({
        where: { admin_id: item.id },
        attributes: [ 'roleName' ],
        raw: true,
      });
      if (roleRecord) {
        role_name = roleRecord.roleName;
      } else if (item.role === 1) {
        role_name = '商家';
      } else if (item.role === 2) {
        role_name = '业务员';
      } else if (item.role === 3) {
        role_name = '主管';
      }

      return {
        id: item.id,
        admin_code: item.admin_code,
        username: item.username,
        nickname: item.nickname,
        gender: item.gender,
        phone: item.phone,
        email: item.email,
        admin_id: adminId,
        admin_username,
        admin_nickname,
        remark: item.remark,
        role: item.role,
        role_name,
        status: item.status,
        bindRechargeaddress: item.bindRechargeaddress,
        last_login_ip: item.last_login_ip,
        last_login_time: item.last_login_time,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
    }));

    return {
      list,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 获取业务员列表
   * 仅返回 role 为 2 的账号
   * @param {Object} query 查询参数
   * @return {Object} 分页列表
   */
  async salespersonList(query = {}) {
    const { ctx } = this;
    const { keyword, username, phone, status, start_time, end_time, bind_admin_id, role, page = 1, page_size = 10 } = query;

    const where = {};

    // 如果传了具体的 role 则按传的查，否则查询业务员(2)和主管(3)
    if (role) {
      where.role = Number(role);
    } else {
      where.role = { [Op.in]: [ 2, 3 ] };
    }

    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    if (bind_admin_id) {
      where.bind_admin_id = Number(bind_admin_id);
    }

    if (username) {
      where.username = { [Op.like]: `%${username}%` };
    }

    if (phone) {
      where.phone = { [Op.like]: `%${phone}%` };
    }

    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { nickname: { [Op.like]: `%${keyword}%` } },
      ];
    }

    if (start_time || end_time) {
      where.created_at = {};
      if (start_time) where.created_at[Op.gte] = start_time;
      if (end_time) where.created_at[Op.lte] = end_time;
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.AdminUser.findAndCountAll({
      where,
      order: [[ 'id', 'DESC' ]],
      offset,
      limit,
    });

    // 查询上级信息并统一字段名
    const list = await Promise.all(rows.map(async admin => {
      const item = admin.toJSON ? admin.toJSON() : admin;
      const adminId = item.bind_admin_id;
      let admin_username = null;
      let admin_nickname = null;
      if (adminId) {
        const parent = await ctx.model.AdminUser.findByPk(adminId, {
          attributes: [ 'username', 'nickname' ],
          raw: true,
        });
        if (parent) {
          admin_username = parent.username;
          admin_nickname = parent.nickname;
        }
      }

      // 获取角色名称
      let role_name = '未知';
      const roleRecord = await ctx.model.Role.findOne({
        where: { admin_id: item.id },
        attributes: [ 'roleName' ],
        raw: true,
      });
      if (roleRecord) {
        role_name = roleRecord.roleName;
      } else if (item.role === 1) {
        role_name = '商家';
      } else if (item.role === 2) {
        role_name = '业务员';
      } else if (item.role === 3) {
        role_name = '主管';
      }

      return {
        id: item.id,
        admin_code: item.admin_code,
        username: item.username,
        nickname: item.nickname,
        gender: item.gender,
        phone: item.phone,
        email: item.email,
        admin_id: adminId,
        admin_username,
        admin_nickname,
        remark: item.remark,
        role: item.role,
        role_name,
        status: item.status,
        bindRechargeaddress: item.bindRechargeaddress,
        last_login_ip: item.last_login_ip,
        last_login_time: item.last_login_time,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
    }));

    return {
      list,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 获取管理员详情
   * @param {number} id 管理员ID
   * @return {Object} 管理员详情
   */
  async detail(id) {
    const { ctx } = this;
    const admin = await ctx.model.AdminUser.findByPk(id, {
      attributes: { exclude: [ 'password' ] },
    });
    if (!admin || admin.status !== 1) {
      ctx.throw(404, '管理员不存在或已禁用');
    }
    const item = admin.toJSON();
    const adminId = item.bind_admin_id;
    let admin_username = null;
    let admin_nickname = null;
    if (adminId) {
      const parent = await ctx.model.AdminUser.findByPk(adminId, {
        attributes: [ 'username', 'nickname' ],
        raw: true,
      });
      if (parent) {
        admin_username = parent.username;
        admin_nickname = parent.nickname;
      }
    }
    return {
      id: item.id,
      admin_code: item.admin_code,
      username: item.username,
      nickname: item.nickname,
      gender: item.gender,
      phone: item.phone,
      email: item.email,
      admin_id: adminId,
      admin_username,
      admin_nickname,
      remark: item.remark,
      role: item.role,
      status: item.status,
      google_code: item.google_code,
      last_login_ip: item.last_login_ip,
      last_login_time: item.last_login_time,
      bindRechargeaddress: item.bindRechargeaddress,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  /**
   * 生成唯一管理员编码（9-12位数字）
   * 用于对外暴露，保证唯一性
   * @return {string} 管理员编码
   */
  async generateAdminCode() {
    const { ctx } = this;
    let code;
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 100) {
      const length = 9 + Math.floor(Math.random() * 4); // 9-12位
      code = String(BigInt('1' + '0'.repeat(length - 1)) + BigInt(Math.floor(Math.random() * 9 * Math.pow(10, length - 1))));
      const admin = await ctx.model.AdminUser.findOne({ where: { admin_code: code } });
      if (!admin) {
        exists = false;
      }
      attempts++;
    }
    return code;
  }

  /**
   * 创建管理员账号
   * @param {Object} payload 管理员数据
   * @return {Object} 创建后的管理员
   */
  async create(payload) {
    const { ctx } = this;
    const { username, password, nickname, gender, phone, email, bind_admin_id, remark, bindRechargeaddress } = payload;
    let { role } = payload;

    ctx.assert(username, 422, '账号不能为空');
    ctx.assert(password, 422, '密码不能为空');

    // 未传角色时默认赋值
    if (role === undefined || role === null || role === '') {
      role = 2;
    }

    role = Number(role);

    const exist = await ctx.model.AdminUser.findOne({ where: { username } });
    if (exist) {
      ctx.throw(422, '账号已存在');
    }

    // 默认绑定到当前操作者账号下
    let finalBindAdminId = bind_admin_id !== undefined && bind_admin_id !== '' ? Number(bind_admin_id) : null;
    if (!finalBindAdminId) {
      finalBindAdminId = ctx.state.admin ? ctx.state.admin.adminId : null;
    }

    // 检查手机号/用户名是否已被普通用户占用
    const existPhone = await ctx.model.User.findOne({ where: { user_phone: username } });
    if (existPhone) {
      ctx.throw(422, '该账号已被用户注册，无法创建');
    }

    const hashedPassword = await ctx.genHash(password);

    let inviteCode = null;
    let userCode = null;
    let adminCode = null;

    // 如果角色不为1(商家)，同步创建前端普通用户
    if (role !== 1) {
      [ inviteCode, userCode, adminCode ] = await Promise.all([
        ctx.service.user.generateInviteCode(),
        ctx.service.user.generateUserCode(),
        this.generateAdminCode(),
      ]);
    } else {
      adminCode = await this.generateAdminCode();
    }

    const transaction = await ctx.model.transaction();
    try {
      const admin = await ctx.model.AdminUser.create({
        admin_code: adminCode,
        username,
        password: hashedPassword,
        nickname,
        gender: gender !== undefined ? Number(gender) : 0,
        phone,
        email,
        bind_admin_id: finalBindAdminId,
        remark,
        role,
        bindRechargeaddress,
      }, { transaction });

      // 如果创建的是商家(role=1)，则初始化默认设置
      if (role === 1) {
        // 初始化 sys_config
        const defaultSysConfigs = [
          { config_key: 'user.money.dai.gift', config_value: '100', config_name: '实名奖励代金配置' },
          { config_key: 'order.pay.timeout.enable', config_value: 'false', config_name: '支付超时任务开关' },
          { config_key: 'order.pay.timeout.time', config_value: '600', config_name: '支付超时默认时间' },
        ];

        for (const config of defaultSysConfigs) {
          await ctx.model.SysConfig.create({
            admin_id: admin.id,
            config_key: config.config_key,
            config_value: config.config_value,
            config_name: config.config_name,
          }, { transaction });
        }

        // 初始化 withdraw_config
        await ctx.model.WithdrawConfig.create({
          admin_id: admin.id,
          min_money: 20,
          sx_rate: '0.03',
          need_task: false,
        }, { transaction });
      }

      // 同步到移动端用户表
      if (role !== 1) {
        await ctx.model.User.create({
          user_id: userCode,
          user_name: username,
          user_nickname: nickname || username,
          user_password: hashedPassword,
          user_withdraw_password: '123456',
          user_phone: username,
          user_status: 0, // 0表示正常，1表示禁用
          bind_admin_id: finalBindAdminId || null,
          bind_salesperson_id: admin.id,
          user_referral_id: finalBindAdminId || null,
          user_ip: ctx.ip || '127.0.0.1',
          user_country: await ctx.service.user.resolveIpLocation(ctx.ip || '127.0.0.1'),
          user_invite_code: inviteCode,
          admin_role: role,
        }, { transaction });
      }

      await transaction.commit();

      return {
        id: admin.id,
        admin_code: adminCode,
        username: admin.username,
        nickname: admin.nickname,
        gender: admin.gender,
        phone: admin.phone,
        email: admin.email,
        admin_id: finalBindAdminId,
        admin_username: finalBindAdminId ? (await ctx.model.AdminUser.findByPk(finalBindAdminId, { attributes: [ 'username' ], raw: true }))?.username : null,
        admin_nickname: finalBindAdminId ? (await ctx.model.AdminUser.findByPk(finalBindAdminId, { attributes: [ 'nickname' ], raw: true }))?.nickname : null,
        remark: admin.remark,
        role: admin.role,
        status: admin.status,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * 更新管理员
   * @param {number} id 管理员ID
   * @param {Object} payload 更新数据
   * @return {Object} 更新后的管理员
   */
  async update(id, payload) {
    const { ctx } = this;
    const admin = await ctx.model.AdminUser.findByPk(id);
    if (!admin) {
      ctx.throw(404, '管理员不存在');
    }

    const updateData = {};
    if (payload.nickname !== undefined) updateData.nickname = payload.nickname;
    if (payload.gender !== undefined) updateData.gender = Number(payload.gender);
    if (payload.phone !== undefined) updateData.phone = payload.phone;
    if (payload.email !== undefined) updateData.email = payload.email;
    if (payload.bind_admin_id !== undefined) {
      updateData.bind_admin_id = payload.bind_admin_id !== '' ? Number(payload.bind_admin_id) : null;
    }
    if (payload.remark !== undefined) updateData.remark = payload.remark;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.bindRechargeaddress !== undefined) updateData.bindRechargeaddress = payload.bindRechargeaddress;
    if (payload.password) {
      updateData.password = await ctx.genHash(payload.password);
    }

    await admin.update(updateData);

    // 同步更新移动端用户表
    const linkedUser = await ctx.model.User.findOne({ where: { bind_salesperson_id: admin.id, admin_role: admin.role } });
    if (linkedUser) {
      const userUpdateData = {};
      if (payload.nickname !== undefined) userUpdateData.user_nickname = payload.nickname;
      if (payload.status !== undefined) userUpdateData.user_status = payload.status === 1 ? 0 : 1; // admin状态1(启用)->user状态0(正常)
      if (payload.password) userUpdateData.user_password = updateData.password;
      if (payload.bind_admin_id !== undefined) {
        userUpdateData.bind_admin_id = updateData.bind_admin_id;
        userUpdateData.user_referral_id = updateData.bind_admin_id;
      }
      await linkedUser.update(userUpdateData);
    }

    const adminId = admin.bind_admin_id;
    let adminUsername = null;
    let adminNickname = null;
    if (adminId) {
      const parentAdmin = await ctx.model.AdminUser.findByPk(adminId, { attributes: [ 'username', 'nickname' ], raw: true });
      if (parentAdmin) {
        adminUsername = parentAdmin.username;
        adminNickname = parentAdmin.nickname;
      }
    }

    return {
      id: admin.id,
      username: admin.username,
      nickname: admin.nickname,
      gender: admin.gender,
      phone: admin.phone,
      email: admin.email,
      admin_id: adminId,
      admin_username: adminUsername,
      admin_nickname: adminNickname,
      remark: admin.remark,
      role: admin.role,
      status: admin.status,
      bindRechargeaddress: admin.bindRechargeaddress,
    };
  }

  /**
   * 重置下级管理员登录密码
   * @param {number} id 管理员ID
   * @param {string} password 新密码
   * @return {Object} 更新后的管理员
   */
  async resetPassword(id, password) {
    const { ctx } = this;
    const admin = await ctx.model.AdminUser.findByPk(id);
    if (!admin) {
      ctx.throw(404, '管理员不存在');
    }

    ctx.assert(password, 422, '新密码不能为空');
    const hashedPassword = await ctx.genHash(password);

    await admin.update({ password: hashedPassword });

    // 同步更新移动端用户表
    const linkedUser = await ctx.model.User.findOne({ where: { admin_id: admin.id } });
    if (linkedUser) {
      await linkedUser.update({ user_password: hashedPassword });
    }

    return {
      id: admin.id,
      username: admin.username,
      nickname: admin.nickname,
    };
  }

  /**
   * 删除管理员（物理删除）
   * @param {number} id 管理员ID
   */
  async destroy(id) {
    const { ctx } = this;
    const admin = await ctx.model.AdminUser.findByPk(id);
    if (!admin) {
      ctx.throw(404, '管理员不存在');
    }

    const transaction = await ctx.model.transaction();
    try {
      // 先解除登录日志、操作日志的外键关联，保留日志记录
      await ctx.model.AdminLoginLog.update(
        { admin_id: null },
        { where: { admin_id: id }, transaction },
      );
      await ctx.model.AdminOperationLog.update(
        { admin_id: null },
        { where: { admin_id: id }, transaction },
      );

      // 同步删除移动端互通账号
      await ctx.model.User.destroy({
        where: { admin_id: id },
        transaction,
      });

      await admin.destroy({ transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * 批量删除业务员/主管账号
   * @param {Array<number>} ids 账号ID数组
   */
  async destroyBatch(ids) {
    const { ctx } = this;
    ctx.assert(Array.isArray(ids) && ids.length > 0, 422, '请选择要删除的账号');

    const admins = await ctx.model.AdminUser.findAll({
      where: { id: { [Op.in]: ids } },
    });

    if (admins.length === 0) {
      ctx.throw(404, '所选账号不存在');
    }

    const transaction = await ctx.model.transaction();
    try {
      await ctx.model.AdminLoginLog.update(
        { admin_id: null },
        { where: { admin_id: { [Op.in]: ids } }, transaction },
      );
      await ctx.model.AdminOperationLog.update(
        { admin_id: null },
        { where: { admin_id: { [Op.in]: ids } }, transaction },
      );

      // 同步删除移动端互通账号
      await ctx.model.User.destroy({
        where: { admin_id: { [Op.in]: ids } },
        transaction,
      });

      await ctx.model.AdminUser.destroy({
        where: { id: { [Op.in]: ids } },
        transaction,
      });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * 记录登录日志
   * @param {Object} data 日志数据
   */
  async recordLoginLog(data) {
    const { ctx } = this;
    try {
      await ctx.model.AdminLoginLog.create(data);
    } catch (err) {
      ctx.logger.error('[AdminUserService] 记录登录日志失败：', err.message);
    }
  }

  /**
   * 记录操作日志
   * @param {Object} data 日志数据
   */
  async recordOperationLog(data) {
    const { ctx } = this;
    try {
      await ctx.model.AdminOperationLog.create(data);
    } catch (err) {
      ctx.logger.error('[AdminUserService] 记录操作日志失败：', err.message);
    }
  }

  /**
   * 格式化登录日志时间
   * @param {Date|string} date 日期
   * @return {string} 北京时间字符串
   */
  formatLoginLogDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = n => (n < 10 ? '0' + n : n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /**
   * 查询登录日志列表
   * @param {Object} query 查询参数
   * @param {number|null} adminId 可选的管理员ID，用于隔离查询
   * @return {Object} 分页列表
   */
  async loginLogs(query = {}, adminId) {
    const { ctx } = this;
    const {
      username, userName,
      status,
      ipaddr, ip,
      start_time, startTime,
      end_time, endTime,
      page = 1, page_size = 10, pageSize,
    } = query;

    const where = {};

    if (adminId !== undefined) {
      where.admin_id = adminId;
    }

    const name = userName !== undefined ? userName : username;
    if (name !== undefined && name !== null && name !== '') {
      where.username = { [Op.like]: `%${name}%` };
    }

    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    const ipAddr = ipaddr !== undefined ? ipaddr : ip;
    if (ipAddr !== undefined && ipAddr !== null && ipAddr !== '') {
      where.ip = { [Op.like]: `%${ipAddr}%` };
    }

    const start = start_time !== undefined ? start_time : startTime;
    const end = end_time !== undefined ? end_time : endTime;
    if ((start !== undefined && start !== '') || (end !== undefined && end !== '')) {
      where.created_at = {};
      if (start !== undefined && start !== '') {
        where.created_at[Op.gte] = new Date(start);
      }
      if (end !== undefined && end !== '') {
        where.created_at[Op.lte] = new Date(end);
      }
    }

    const size = Number(pageSize || page_size);
    const pageNum = Math.max(1, Number(page) || 1);
    const offset = (pageNum - 1) * size;
    const limit = size;

    const { count, rows } = await ctx.model.AdminLoginLog.findAndCountAll({
      where,
      order: [[ 'id', 'DESC' ]],
      offset,
      limit,
    });

    const list = rows.map(log => {
      const createdAt = log.createdAt || log.created_at;
      return {
        infoId: log.id,
        userName: log.username || null,
        ipaddr: log.ip || null,
        loginLocation: log.location || null,
        browser: log.browser || null,
        os: log.os || null,
        status: log.status,
        msg: log.operation || null,
        loginTime: createdAt ? this.formatLoginLogDate(createdAt) : '',
        remark: log.remark || null,
      };
    });

    return {
      total: count,
      list,
      pagination: {
        total: count,
        page: pageNum,
        page_size: size,
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 批量删除登录日志
   * @param {Array<number>} ids 日志ID数组
   */
  async batchDestroyLoginLogs(ids) {
    const { ctx } = this;
    ctx.assert(Array.isArray(ids) && ids.length > 0, 422, '请选择要删除的日志');

    await ctx.model.AdminLoginLog.destroy({
      where: {
        id: { [Op.in]: ids },
      },
    });
  }

  /**
   * 清空登录日志
   */
  async clearLoginLogs() {
    const { ctx } = this;
    await ctx.model.AdminLoginLog.destroy({ where: {} });
  }

  /**
   * 查询操作日志列表
   * @param {Object} query 查询参数
   * @return {Object} 分页列表
   */
  async operationLogs(query = {}) {
    const { ctx } = this;
    const { username, module, status, page = 1, page_size = 10 } = query;

    const where = {};
    if (username) {
      where.username = { [Op.like]: `%${username}%` };
    }
    if (module) {
      where.module = module;
    }
    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.AdminOperationLog.findAndCountAll({
      where,
      order: [[ 'id', 'DESC' ]],
      offset,
      limit,
    });

    const list = rows.map(log => {
      const createdAt = log.createdAt || log.created_at;
      const duration = log.duration || 0;
      const durationText = duration < 1000 ? `${duration}毫秒` : `${(duration / 1000).toFixed(2)}秒`;
      return {
        log_number: log.id,
        module: log.module,
        action: log.action,
        username: log.username,
        ip: log.ip,
        location: log.location,
        status: log.status,
        status_text: log.status === 1 ? '成功' : '失败',
        operation_date: createdAt ? new Date(createdAt).toLocaleString('zh-CN', { hour12: false }) : '',
        duration,
        duration_text: durationText,
      };
    });

    return {
      list,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }
}

module.exports = AdminUserService;
