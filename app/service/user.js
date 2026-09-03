'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

/**
 * 用户服务层
 * 处理用户注册、登录、信息查询与更新
 */
class UserService extends Service {
  /**
   * 根据父用户解析归属信息（店铺ID和业务员ID）
   * @param {Object} parent 父用户记录（users表）
   * @return {Promise<Object>} { adminId, salesmanId }
   */
  async resolveAffiliation(parent) {
    const { ctx } = this;
    const result = { adminId: null, salesmanId: null };
    if (!parent) return result;

    const visited = new Set();
    let u = parent;
    while (u) {
      const code = String(u.user_id);
      if (visited.has(code)) break;
      visited.add(code);

      if (!result.adminId && u.bind_admin_id) result.adminId = Number(u.bind_admin_id);
      if (!result.salesmanId && u.bind_salesperson_id) result.salesmanId = Number(u.bind_salesperson_id);

      // 如果自身角色就是业务员(历史遗留逻辑，视情况保留)
      if (u.admin_role === 2 && !result.salesmanId) {
        result.salesmanId = Number(u.bind_salesperson_id || u.bind_admin_id);
      }

      if (result.adminId && result.salesmanId) break;

      // 沿 user_referral_id（存储的是user_code）递归
      if (!u.user_referral_id) break;
      u = await ctx.model.User.findOne({ where: { user_id: String(u.user_referral_id) } });
    }
    return result;
  }

  /**
   * 通过 user_id（9-12位）或数据库主键ID查找用户
   * @param {string|number} identifier 用户ID（9-12位）或数据库主键ID
   * @return {Promise<Object|null>} 用户记录
   */
  async findUserByCodeOrId(identifier) {
    const { ctx } = this;
    if (identifier === undefined || identifier === null || identifier === '') return null;
    const strVal = String(identifier);
    // 9+ 位视为 user_id（即 user_code）
    if (strVal.length >= 9) {
      const user = await ctx.model.User.findOne({ where: { user_id: strVal } });
      if (user) return user;
    }
    return await ctx.model.User.findByPk(Number(identifier));
  }

  /**
   * 获取用户数据库主键ID
   * @param {string|number} userId 用户ID（9-12位）
   * @return {Promise<number|null>} 数据库主键ID
   */
  async getDbUserId(userId) {
    const { ctx } = this;
    if (!userId) return null;
    const strVal = String(userId);
    // 9+ 位视为 user_id（即 user_code），查找对应的主键ID
    if (strVal.length >= 9) {
      const user = await ctx.model.User.findOne({ where: { user_id: strVal } });
      return user ? user.id : null;
    }
    // 否则视为主键ID
    return Number(userId);
  }

  /**
   * 格式化用户数据，确保返回的 user_id 是9-12位
   * @param {Object} user 用户记录
   * @param {Object} options 选项 { withPassword: boolean }
   * @return {Object} 格式化后的用户数据
   */
  formatUserData(user, options = {}) {
    if (!user) return null;
    const data = user.toJSON ? user.toJSON() : { ...user };

    // 处理 DECIMAL 字段
    const decimalFields = [
      'user_balance', 'coupon_balance', 'static_income',
      'dynamic_income', 'total_recharge_amount', 'user_invite_income',
    ];
    for (const field of decimalFields) {
      if (data[field] !== undefined && data[field] !== null) {
        data[field] = Number(data[field]) || 0;
      }
    }

    // 删除不需要的字段
    if (!options.withPassword) {
      delete data.user_password;
      delete data.user_withdraw_password;
    }

    // 确保 user_id 是9-12位（现在模型已修改，user_id 直接映射到 user_code）
    // 不再需要手动映射

    return data;
  }

  /**
   * 用户注册
   * @param {Object} payload 注册参数
   * @return {Object} 创建的用户记录
   */
  async register(payload) {
    const { ctx } = this;
    const { user_phone, user_password, confirm_password, user_invite_code, user_ip } = payload;

    // 校验两次密码是否一致
    if (user_password !== confirm_password) {
      ctx.throw(422, '两次输入的密码不一致');
    }

    // 校验手机号是否已注册
    const existPhone = await ctx.model.User.findOne({ where: { user_phone } });
    if (existPhone) {
      ctx.throw(409, '手机号已被注册');
    }

    let userReferralId = null;
    let adminId = null;
    let bindSalesmanId = null;
    let userLevel = 1;
    // 如果填写了邀请码，校验并查找上级用户
    if (user_invite_code) {
      const parent = await ctx.model.User.findOne({ where: { user_invite_code } });
      if (!parent) {
        ctx.throw(422, '邀请码无效');
      }
      userReferralId = parent.user_id; // 使用 user_id（9-12位）
      userLevel = (parent.user_level || 1) + 1;
      // 根据父用户解析归属店铺和业务员
      const affiliation = await this.resolveAffiliation(parent);
      adminId = affiliation.adminId;
      bindSalesmanId = affiliation.salesmanId;
    }

    // 密码加密
    const hashedPassword = await ctx.genHash(user_password);
    // 默认提现密码（明文存储）
    const defaultWithdrawPassword = '123456';

    // 默认绑定 VIP1 及其关联的策略
    const vip1 = await ctx.model.Vip.findOne({ where: { vipLv: 1 } });
    const strategyId = vip1 && vip1.policyId ? vip1.policyId : 0;

    // 生成用户编码和邀请码
    const [ userCode, personalInviteCode ] = await Promise.all([
      this.generateUserCode(),
      this.generateInviteCode(),
    ]);

    const userData = {
      user_id: userCode, // user_id 映射到数据库 user_code
      user_name: user_phone,
      user_password: hashedPassword,
      user_withdraw_password: defaultWithdrawPassword,
      user_phone,
      user_referral_id: userReferralId,
      user_level: userLevel,
      user_ip,
      user_country: await this.resolveIpLocation(user_ip),
      user_invite_code: personalInviteCode,
      strategy_id: strategyId,
    };

    if (adminId) {
      userData.admin_id = adminId;
    }
    if (bindSalesmanId) {
      userData.direct_admin_id = bindSalesmanId;
    }

    // 创建用户
    const user = await ctx.model.User.create(userData);

    // 返回格式化后的用户数据（user_id 已经是9-12位）
    return this.formatUserData(user);
  }

  /**
   * 生成唯一用户编码（9-12位数字）
   * 用于对外暴露，保证唯一性
   * @return {string} 用户编码
   */
  async generateUserCode() {
    const { ctx } = this;
    let code;
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 100) {
      const length = 9 + Math.floor(Math.random() * 4); // 9-12位
      code = String(BigInt('1' + '0'.repeat(length - 1)) + BigInt(Math.floor(Math.random() * 9 * Math.pow(10, length - 1))));
      const user = await ctx.model.User.findOne({ where: { user_id: code } });
      if (!user) {
        exists = false;
      }
      attempts++;
    }
    return code;
  }

  /**
   * 生成唯一邀请码
   * 格式：6位随机数字，例如 105963
   * 循环生成直到唯一为止
   * @return {string} 邀请码
   */
  async generateInviteCode() {
    const { ctx } = this;
    let code;
    let exists = true;
    while (exists) {
      code = String(Math.floor(Math.random() * 900000) + 100000);
      const user = await ctx.model.User.findOne({ where: { user_invite_code: code } });
      if (!user) {
        exists = false;
      }
    }
    return code;
  }

  /**
   * 根据IP解析地区
   * 优先使用 ip2region 库，未安装或解析失败时返回兜底值
   * @param {string} ip IP地址
   * @return {string} 地区信息
   */
  async resolveIpLocation(ip) {
    if (!ip) return '未知';
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return '本地';
    }

    try {
      const IP2Region = require('ip2region');
      let searcher;
      if (typeof IP2Region.create === 'function') {
        searcher = IP2Region.create();
      } else if (typeof IP2Region === 'function') {
        searcher = new IP2Region();
      } else {
        return '未知';
      }
      const result = searcher.search(ip);
      if (!result) return '未知';
      if (typeof result === 'string') return result;
      if (result.region) return result.region;
      if (result.country || result.province || result.city) {
        return [ result.country, result.province, result.city ].filter(Boolean).join(' ');
      }
      return '未知';
    } catch (err) {
      return '未知';
    }
  }

  /**
   * 从地区信息中提取国家
   * @param {string} location 地区信息，如 "中国|0|广东省|广州市|电信" 或 "中国 广东 广州"
   * @return {string} 国家名称
   */
  extractCountry(location) {
    if (!location || location === '未知' || location === '本地') return location || '未知';
    return location.split(/[| ]/)[0];
  }

  /**
   * 用户登录
   * @param {Object} payload 登录参数
   * @param {Object} meta 登录环境信息 { ip, device, browser, os }
   * @return {Object} 用户信息及 JWT Token
   */
  async login(payload, meta = {}) {
    const { ctx, app } = this;
    const { user_phone, user_password } = payload;
    const { ip, device, browser, os } = meta;
    const startTime = Date.now();

    const user = await ctx.model.User.findOne({ where: { user_phone } });
    if (!user) {
      await this.recordLoginLog({
        user_name: user_phone,
        ip,
        device,
        browser,
        os,
        operation: '登录失败：用户不存在',
        status: 1,
        duration: Date.now() - startTime,
      });
      ctx.throw(401, '手机号或密码错误');
    }

    const match = await ctx.compare(user_password, user.user_password);
    if (!match) {
      await this.recordLoginLog({
        user_id: user.user_id,
        user_name: user.user_name || user_phone,
        ip,
        device,
        browser,
        os,
        operation: '登录失败：密码错误',
        status: 1,
        duration: Date.now() - startTime,
      });
      ctx.throw(401, '手机号或密码错误');
    }

    if (user.user_status !== 0) {
      await this.recordLoginLog({
        user_id: user.user_id,
        user_name: user.user_name || user_phone,
        ip,
        device,
        browser,
        os,
        operation: '登录失败：账号已禁用',
        status: 1,
        duration: Date.now() - startTime,
      });
      ctx.throw(403, '账号已被禁用');
    }

    const accessToken = app.jwt.sign(
      { userId: user.user_id, user_phone: user.user_phone, type: 'user' },
      app.config.jwt.secret,
      { expiresIn: app.config.jwt.expiresIn },
    );

    const refreshToken = app.jwt.sign(
      { userId: user.user_id, type: 'user', isRefresh: true },
      app.config.jwt.secret,
      { expiresIn: app.config.jwt.refreshExpiresIn },
    );

    await this.recordLoginLog({
      user_id: user.user_id,
      user_name: user.user_name || user_phone,
      ip,
      device,
      browser,
      os,
      operation: '登录成功',
      status: 0,
      duration: Date.now() - startTime,
    });

    // 返回格式化后的用户数据（user_id 已经是9-12位）
    const userData = this.formatUserData(user);

    return { user: userData, accessToken, refreshToken };
  }

  /**
   * 记录用户登录日志
   * @param {Object} data 日志数据
   */
  async recordLoginLog(data) {
    const { ctx } = this;
    try {
      await ctx.model.UserLoginLog.create(data);
    } catch (err) {
      ctx.logger.error('[UserService] 记录用户登录日志失败：', err.message);
    }
  }

  /**
   * 根据ID查询用户
   * @param {number} id 用户ID（9-12位）或数据库主键ID
   * @return {Object|null} 用户记录
   */
  async findById(id) {
    const user = await this.findUserByCodeOrId(id);
    if (!user) {
      return null;
    }
    return this.formatUserData(user);
  }

  /**
   * 获取用户邀请码及邀请收入
   * @param {number} id 用户ID
   * @return {Object} 邀请码和邀请收入信息
   */
  async getInviteInfo(id) {
    const { ctx } = this;
    const user = await this.findUserByCodeOrId(id);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    return {
      user_invite_code: user.user_invite_code,
      user_invite_income: user.user_invite_income,
    };
  }

  /**
   * 修改登录密码
   * @param {number} id 用户ID（9-12位）或数据库主键ID
   * @param {Object} payload 密码参数
   */
  async updatePassword(id, payload) {
    const { ctx } = this;
    // 兼容前端驼峰命名与下划线命名
    const old_password = payload.old_password || payload.oldPassword;
    const new_password = payload.new_password || payload.newPassword;
    const confirm_password = payload.confirm_password || payload.confirmPassword;

    ctx.assert(old_password, 422, '旧密码不能为空');
    ctx.assert(new_password, 422, '新密码不能为空');
    ctx.assert(confirm_password, 422, '确认密码不能为空');
    ctx.assert(new_password.length >= 6, 422, '新密码长度不能少于6位');
    if (new_password !== confirm_password) {
      ctx.throw(422, '两次输入的新密码不一致');
    }

    const user = await this.findUserByCodeOrId(id);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    const match = await ctx.compare(old_password, user.user_password);
    if (!match) {
      ctx.throw(422, '旧密码错误');
    }

    const hashedPassword = await ctx.genHash(new_password);
    await user.update({ user_password: hashedPassword });
  }

  /**
   * 修改提现密码
   * @param {number} id 用户ID（9-12位）或数据库主键ID
   * @param {Object} payload 密码参数
   */
  async updateWithdrawPassword(id, payload) {
    const { ctx } = this;
    // 兼容前端驼峰命名与下划线命名
    const old_password = payload.old_password || payload.oldPassword;
    const new_password = payload.new_password || payload.newPassword;
    const confirm_password = payload.confirm_password || payload.confirmPassword;

    ctx.assert(new_password, 422, '新密码不能为空');
    ctx.assert(confirm_password, 422, '确认密码不能为空');
    if (new_password !== confirm_password) {
      ctx.throw(422, '两次输入的新密码不一致');
    }

    const user = await this.findUserByCodeOrId(id);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    // 如果已设置过提现密码，必须校验旧密码（兼容历史 bcrypt 密文和当前明文）
    if (user.user_withdraw_password) {
      ctx.assert(old_password, 422, '旧密码不能为空');
      const isPlain = !user.user_withdraw_password.startsWith('$2a$');
      const match = isPlain ? old_password === user.user_withdraw_password : await ctx.compare(old_password, user.user_withdraw_password);
      if (!match) {
        ctx.throw(422, '旧密码错误');
      }
    }

    // 提现密码改为明文存储
    await user.update({ user_withdraw_password: new_password });
  }

  /**
   * 修改用户 VIP 等级
   * @param {number} id 用户ID（9-12位）或数据库主键ID
   * @param {Object} payload VIP参数
   */
  async updateVipLevel(id, payload) {
    const { ctx } = this;
    const { user_vip } = payload;

    ctx.assert(user_vip !== undefined, 422, 'VIP等级不能为空');
    const level = Number(user_vip);
    ctx.assert([ 1, 2, 3, 4 ].includes(level), 422, 'VIP等级只能是 1-4');

    const user = await this.findUserByCodeOrId(id);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    await user.update({ user_vip: level });

    return this.formatUserData(user);
  }

  /**
   * 获取账户余额
   * @param {number} id 用户ID（9-12位）或数据库主键ID
   * @return {Object} 余额信息
   */
  async getBalance(id) {
    const { ctx } = this;
    const user = await this.findUserByCodeOrId(id);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    return {
      user_id: user.user_id,
      user_balance: user.user_balance,
    };
  }

  /**
   * 获取物流地址
   * @param {number} userId 用户ID
   * @return {Object} 物流地址信息
   */
  async getLogisticsAddress(userId) {
    const { ctx } = this;
    const address = await ctx.model.LogisticsAddress.findOne({
      where: { user_id: userId, status: 1 },
      order: [[ 'is_default', 'DESC' ], [ 'user_id', 'DESC' ]],
    });

    if (!address) {
      return null;
    }

    return {
      id: address.id,
      name: address.name,
      phone: address.phone,
      address: address.address,
      is_default: address.is_default,
    };
  }

  /**
   * 创建或修改物流地址
   * @param {number} userId 用户ID
   * @param {Object} payload 地址参数
   * @return {Object} 地址信息
   */
  async saveLogisticsAddress(userId, payload) {
    const { ctx } = this;
    const { name, phone, address, is_default = 0 } = payload;

    ctx.assert(name, 422, '姓名不能为空');
    ctx.assert(phone, 422, '联系方式不能为空');
    ctx.assert(address, 422, '地址不能为空');

    const exist = await ctx.model.LogisticsAddress.findOne({
      where: { user_id: userId, status: 1 },
    });

    let record;
    if (exist) {
      // 如果当前设为默认，取消该用户其他默认地址
      if (is_default === 1 || is_default === '1') {
        await ctx.model.LogisticsAddress.update(
          { is_default: 0 },
          { where: { user_id: userId, status: 1 } },
        );
      }
      await exist.update({ name, phone, address, is_default });
      record = exist;
    } else {
      record = await ctx.model.LogisticsAddress.create({
        user_id: userId,
        name,
        phone,
        address,
        is_default,
      });
    }

    return {
      id: record.id,
      name: record.name,
      phone: record.phone,
      address: record.address,
      is_default: record.is_default,
    };
  }

  /**
   * 删除物流地址（软删除）
   * @param {number} userId 用户ID
   */
  async deleteLogisticsAddress(userId) {
    const { ctx } = this;
    const address = await ctx.model.LogisticsAddress.findOne({
      where: { user_id: userId, status: 1 },
    });
    if (!address) {
      ctx.throw(404, '物流地址不存在');
    }

    await address.update({ status: 0 });
  }

  /**
   * 上传用户凭证
   * @param {number} userId 用户ID
   * @param {Object} payload 凭证参数
   * @return {Object} 凭证信息
   */
  async uploadCredential(userId, payload) {
    const { ctx } = this;
    const { real_name, id_number, front_image, back_image } = payload;

    ctx.assert(real_name, 422, '姓名不能为空');
    ctx.assert(id_number, 422, '证件号不能为空');
    ctx.assert(front_image, 422, '正面图片不能为空');
    ctx.assert(back_image, 422, '反面图片不能为空');

    const dbUserId = await this.getDbUserId(userId);
    if (!dbUserId) {
      ctx.throw(404, '用户不存在');
    }

    // 每个用户仅保留一条有效凭证，上传新凭证时禁用旧凭证
    await ctx.model.UserCredential.update(
      { status: 0 },
      { where: { user_id: dbUserId, status: 1 } },
    );

    const credential = await ctx.model.UserCredential.create({
      user_id: dbUserId,
      real_name,
      id_number,
      front_image,
      back_image,
    });

    return {
      id: credential.id,
      real_name: credential.real_name,
      id_number: credential.id_number,
      front_image: credential.front_image,
      back_image: credential.back_image,
    };
  }

  /**
   * 删除用户凭证（软删除）
   * @param {number} userId 用户ID
   */
  async deleteCredential(userId) {
    const { ctx } = this;
    const dbUserId = await this.getDbUserId(userId);
    if (!dbUserId) {
      ctx.throw(404, '用户不存在');
    }
    const credential = await ctx.model.UserCredential.findOne({
      where: { user_id: dbUserId, status: 1 },
    });
    if (!credential) {
      ctx.throw(404, '凭证不存在');
    }

    await credential.update({ status: 0 });
  }

  /**
   * 获取我的任务统计
   * @param {number} userId 用户ID
   * @return {Object} 任务统计信息
   */
  async getMyTasks(userId) {
    const { ctx } = this;
    const user = await ctx.model.User.findByPk(userId, {
      attributes: [ 'user_id', 'user_vip', 'user_balance', 'strategy_id' ],
    });
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    // 查询用户关联的策略获取任务数量上限
    let taskLimit = 30; // 默认兜底值
    if (user.strategy_id) {
      const strategy = await ctx.model.Strategy.findByPk(user.strategy_id, {
        attributes: [ 'task_count' ],
      });
      if (strategy && strategy.task_count !== undefined) {
        taskLimit = strategy.task_count;
      }
    } else {
      // 兼容历史数据，如果没有绑定策略，通过 vip 等级获取对应 policyId
      const vipConfig = await ctx.model.Vip.findOne({ where: { vipLv: user.user_vip } });
      if (vipConfig && vipConfig.policyId) {
        const strategy = await ctx.model.Strategy.findByPk(vipConfig.policyId, {
          attributes: [ 'task_count' ],
        });
        if (strategy && strategy.task_count !== undefined) {
          taskLimit = strategy.task_count;
        }
      }
    }

    // 今日日期与昨日日期
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // 完成的任务总数
    const completedCount = await ctx.model.UserTask.count({
      where: { user_id: userId, status: 1 },
    });

    // 今日任务收益
    const todayIncomeResult = await ctx.model.UserTask.sum('reward', {
      where: { user_id: userId, status: 1, task_date: todayStr },
    });

    // 昨日任务收益
    const yesterdayIncomeResult = await ctx.model.UserTask.sum('reward', {
      where: { user_id: userId, status: 1, task_date: yesterdayStr },
    });

    return {
      completed_task_count: completedCount,
      today_task_income: todayIncomeResult || 0,
      yesterday_task_income: yesterdayIncomeResult || 0,
      user_balance: user.user_balance,
      user_vip: user.user_vip,
      task_limit: taskLimit,
    };
  }

  /**
   * 获取我的团队
   * @param {number} userId 当前用户ID
   * @param {Object} query 查询参数
   * @return {Object} 团队列表及统计
   */
  async getTeam(userId, query = {}) {
    const { ctx } = this;
    const { page = 1, page_size = 10 } = query;

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.User.findAndCountAll({
      where: { user_referral_id: userId, user_status: 0 },
      attributes: [ 'user_id', 'user_name', 'user_invite_income', 'total_recharge_amount', 'user_create_time' ],
      order: [[ 'user_id', 'DESC' ]],
      offset,
      limit,
    });

    // 统计汇总
    const totalRecharge = await ctx.model.User.sum('total_recharge_amount', {
      where: { user_referral_id: userId, user_status: 0 },
    });
    const totalInviteIncome = await ctx.model.User.sum('user_invite_income', {
      where: { user_referral_id: userId, user_status: 0 },
    });

    return {
      list: rows.map(item => ({
        user_id: item.user_id,
        user_name: item.user_name,
        user_invite_income: item.user_invite_income,
        total_recharge_amount: item.total_recharge_amount,
      })),
      statistics: {
        total_recharge_amount: totalRecharge || 0,
        total_invite_income: totalInviteIncome || 0,
        valid_subordinate_count: count,
      },
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 管理端获取手机端用户列表
   * @param {Object} query 查询参数
   * @param {Object} operator 当前操作者 { role, id }
   * @return {Object} 用户列表、统计数据及分页信息
   */
  async adminList(query = {}, operator = {}) {
    const { ctx } = this;
    const {
      user_id, user_referral_id, user_name, user_phone, admin_id, user_level, user_ip,
      has_recharged, is_real, sort_by_asset, user_status, start_time, end_time,
      page = 1, page_size = 10,
    } = query;
    const { role: operatorRole, id: operatorId } = operator;

    const where = {
      admin_role: null, // 只返回通过 H5 注册的用户，不返回业务员账号
    };

    // 数据隔离逻辑
    // 1. 超级管理员 (role = 1)：返回该店铺下的所有业务员的下级用户列表
    // 2. 业务员 (role = 2)：只返回当前店铺下，根据自己邀请码注册的 H5 用户
    if (operatorRole === 1) {
      where.bind_admin_id = operatorId;
    } else if (operatorRole === 2) {
      // 查找该业务员对应的 User 记录
      const salespersonUser = await ctx.model.User.findOne({
        where: { bind_salesperson_id: operatorId, admin_role: 2 },
        attributes: [ 'user_id' ],
        raw: true,
      });

      if (salespersonUser) {
        where.user_referral_id = salespersonUser.user_id;
      } else {
        // 如果找不到对应的业务员用户记录，则不返回任何数据
        where.user_id = -1;
      }
    }

    // 精确查询（user_id 现在直接映射到 user_code，9-12位）
    if (user_id !== undefined && user_id !== '') {
      const strVal = String(user_id);
      if (strVal.length >= 9) {
        // 9+ 位数字视为 user_id（即 user_code）
        const user = await ctx.model.User.findOne({ where: { user_id: strVal } });
        if (user) {
          where.user_id = strVal;
        } else {
          where.user_id = -1; // 无结果
        }
      } else {
        // 否则视为主键ID
        where.id = Number(user_id);
      }
    }
    if (user_referral_id !== undefined && user_referral_id !== '') {
      const refVal = String(user_referral_id);
      if (refVal.length >= 9) {
        // 9+ 位视为 user_id（即 user_code），查找对应的用户
        const parent = await ctx.model.User.findOne({ where: { user_id: refVal } });
        if (parent) {
          where.user_referral_id = parent.user_id; // user_id 现在直接是9-12位
        } else {
          where.user_referral_id = 'not_found'; // 无结果
        }
      } else {
        // 旧数据：存的是数据库ID，需要转换为user_id
        const parent = await ctx.model.User.findByPk(Number(refVal));
        if (parent) {
          where.user_referral_id = parent.user_id; // user_id 现在直接是9-12位
        } else {
          where.user_referral_id = 'not_found'; // 无结果
        }
      }
    }
    if (admin_id !== undefined && admin_id !== '') {
      const queryAdminId = Number(admin_id);
      if (operatorRole === 2 && queryAdminId !== operatorId) {
        ctx.throw(403, '当前角色无权查看该业务员的用户');
      }
      if (operatorRole !== 2) {
        where.bind_salesperson_id = queryAdminId;
      }
    }
    if (user_level !== undefined && user_level !== '') {
      where.user_level = Number(user_level);
    }
    // 是否为真实客户：0=真实用户(true)，1=虚拟用户(false)
    if (is_real !== undefined && is_real !== '') {
      where.is_real = Number(is_real) === 0 || is_real === true;
    }

    // 模糊查询
    if (user_name) {
      where.user_name = { [Op.like]: `%${user_name}%` };
    }
    if (user_phone) {
      where.user_phone = { [Op.like]: `%${user_phone}%` };
    }
    if (user_ip) {
      where.user_ip = { [Op.like]: `%${user_ip}%` };
    }

    // 用户状态：0=正常，1=禁用
    if (user_status !== undefined && user_status !== null && user_status !== '') {
      where.user_status = Number(user_status);
    }

    // 注册时间范围
    if (start_time || end_time) {
      where.user_create_time = {};
      if (start_time) where.user_create_time[Op.gte] = start_time;
      if (end_time) where.user_create_time[Op.lte] = end_time;
    }

    // 是否充值（状态为1表示已通过）
    // 查询参数约定：0 表示已充值，1 表示未充值
    if (has_recharged === '1' || has_recharged === 1 || has_recharged === '0' || has_recharged === 0) {
      const rechargedRows = await ctx.model.RechargeRecord.findAll({
        attributes: [[ ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('user_id')), 'user_id' ]],
        where: { status: 1 },
        raw: true,
      });
      const rechargedUserIds = rechargedRows.map(r => r.user_id);

      if (has_recharged === '1' || has_recharged === 1) {
        where.user_id = { [Op.notIn]: rechargedUserIds };
      } else {
        where.user_id = { [Op.in]: rechargedUserIds };
      }
    }

    // 排序
    let order = [[ 'user_id', 'DESC' ]];
    if (sort_by_asset === 'balance_asc') {
      order = [[ 'user_balance', 'ASC' ]];
    } else if (sort_by_asset === 'balance_desc') {
      order = [[ 'user_balance', 'DESC' ]];
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.User.findAndCountAll({
      where,
      attributes: [
        'user_id', 'user_referral_id', 'bind_admin_id', 'bind_salesperson_id', 'user_name', 'user_phone',
        'user_password', 'user_withdraw_password', 'user_invite_code',
        'user_ip', 'user_country', 'user_remark', 'user_vip', 'is_real',
        'user_balance', 'coupon_balance', 'static_income', 'dynamic_income',
        'user_status', 'withdrawal_status', 'temp_withdraw_status', 'user_level', 'user_create_time', 'user_update_time', 'strategy_id', 'is_task_started',
      ],
      order,
      offset,
      limit,
    });

    // 查询当前页用户的充值、提现统计及首充信息
    // 使用用户主键ID查询关联表，建立映射关系
    const dbUserIds = rows.map(u => u.id); // 主键ID
    const userIdMap = {}; // 主键ID -> user_id（9-12位）
    for (const row of rows) {
      userIdMap[row.id] = row.user_id;
    }

    const [ rechargeStats, withdrawStats, firstRechargeRecords ] = await Promise.all([
      ctx.model.RechargeRecord.findAll({
        attributes: [
          'user_id',
          [ ctx.app.Sequelize.fn('SUM', ctx.app.Sequelize.col('amount')), 'total_amount' ],
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.col('user_id')), 'total_count' ],
        ],
        where: { user_id: { [Op.in]: dbUserIds }, status: 1, amount: { [Op.gt]: 0 } },
        group: [ 'user_id' ],
        raw: true,
      }),
      ctx.model.WithdrawRecord.findAll({
        attributes: [
          'user_id',
          [ ctx.app.Sequelize.fn('SUM', ctx.app.Sequelize.col('amount')), 'total_amount' ],
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.col('user_id')), 'total_count' ],
        ],
        where: { user_id: { [Op.in]: dbUserIds }, status: 1 },
        group: [ 'user_id' ],
        raw: true,
      }),
      ctx.model.RechargeRecord.findAll({
        attributes: [ 'user_id', 'amount', 'created_at' ],
        where: { user_id: { [Op.in]: dbUserIds }, status: 1, amount: { [Op.gt]: 0 } },
        order: [[ 'created_at', 'ASC' ]],
        raw: true,
      }),
    ]);

    // 构建首充Map（key为主键ID）
    const firstRechargeMap = {};
    for (const record of firstRechargeRecords) {
      if (!firstRechargeMap[record.user_id]) {
        firstRechargeMap[record.user_id] = record;
      }
    }

    const rechargeMap = {};
    for (const stat of rechargeStats) {
      rechargeMap[stat.user_id] = stat;
    }
    const withdrawMap = {};
    for (const stat of withdrawStats) {
      withdrawMap[stat.user_id] = stat;
    }

    // 查询当前页用户的收货地址（优先取默认地址，其次取最新地址）
    const logisticsAddresses = await ctx.model.LogisticsAddress.findAll({
      where: { user_id: { [Op.in]: dbUserIds }, status: 1 },
      order: [[ 'is_default', 'DESC' ], [ 'user_id', 'DESC' ]],
      raw: true,
    });
    const addressMap = {};
    for (const addr of logisticsAddresses) {
      if (!addressMap[addr.user_id]) {
        addressMap[addr.user_id] = addr;
      }
    }

    // 查询业务员名称映射
    const adminIds = [ ...new Set(rows.map(u => u.bind_salesperson_id).filter(Boolean)) ];
    const salespersonMap = {};
    if (adminIds.length > 0) {
      const salespersons = await ctx.model.AdminUser.findAll({
        attributes: [ 'id', 'nickname', 'username' ],
        where: { id: { [Op.in]: adminIds } },
        raw: true,
      });
      for (const sp of salespersons) {
        salespersonMap[sp.id] = sp.nickname || sp.username;
      }
    }

    // 查询父用户映射（用于处理 parent_id 逻辑）
    // 如果父级是业务员，返回业务员的 admin_user.id；如果是普通用户，返回用户的 user_id
    const parentMap = {};
    const parentUserIds = rows.map(u => u.user_referral_id).filter(Boolean);
    if (parentUserIds.length > 0) {
      const parents = await ctx.model.User.findAll({
        attributes: [ 'user_id', 'bind_admin_id', 'bind_salesperson_id', 'admin_role' ],
        where: { user_id: { [Op.in]: parentUserIds } },
        raw: true,
      });
      for (const p of parents) {
        // 如果父级 admin_role 为 2 (业务员)，则 parent_id 使用其 bind_salesperson_id (即 admin_user.id)
        // 否则使用其 user_id
        parentMap[p.user_id] = p.admin_role === 2 ? p.bind_salesperson_id : p.user_id;
      }
    }

    // 计算用户层级映射
    const userLevelMap = {};
    const allReferralIds = rows.map(u => u.user_referral_id).filter(Boolean);
    if (allReferralIds.length > 0) {
      const referralUsers = await ctx.model.User.findAll({
        attributes: [ 'user_id', 'user_referral_id', 'user_level' ],
        raw: true,
      });
      const userById = {};
      for (const u of referralUsers) {
        userById[u.user_id] = u;
      }
      // 对每个用户计算层级
      for (const row of rows) {
        let level = 1;
        let currentReferralId = row.user_referral_id;
        const visited = new Set();
        while (currentReferralId) {
          if (visited.has(currentReferralId)) break;
          visited.add(currentReferralId);
          const parent = userById[currentReferralId];
          if (!parent) break;
          level++;
          currentReferralId = parent.user_referral_id;
        }
        userLevelMap[row.user_id] = level;
      }
    }

    const list = await Promise.all(rows.map(async item => {
      const dbUserId = item.id; // 主键ID
      const rStat = rechargeMap[dbUserId] || {};
      const wStat = withdrawMap[dbUserId] || {};
      const firstRecharge = firstRechargeMap[dbUserId] || {};
      const address = addressMap[dbUserId];
      const registerLocation = item.user_country || await this.resolveIpLocation(item.user_ip);

      const spId = item.bind_salesperson_id;
      const spName = spId ? (salespersonMap[spId] || '') : '';

      // user_referral_id 现在存储的是 user_code，直接使用
      const referralCode = item.user_referral_id || null;

      // 计算用户层级
      const computedLevel = userLevelMap[item.user_id] || item.user_level || 1;

      return {
        user_id: item.user_id, // 现在直接是9-12位编码
        user_referral_id: referralCode,
        user_name: item.user_name,
        user_phone: item.user_phone || null,
        user_ip: item.user_ip || null,
        country: this.extractCountry(registerLocation),
        remark: item.user_remark,
        user_vip: item.user_vip,
        is_real: item.is_real,
        balance: Number(item.user_balance) || 0,
        voucher_balance: Number(item.coupon_balance) || 0,
        static_income: Number(item.static_income) || 0,
        dynamic_income: Number(item.dynamic_income) || 0,
        has_recharged: rStat.total_count > 0,
        user_status: item.user_status,
        withdrawal_status: item.withdrawal_status,
        temp_withdraw_status: item.temp_withdraw_status,
        total_recharge_amount: Number(rStat.total_amount) || 0,
        total_recharge_count: Number(rStat.total_count) || 0,
        first_recharge_amount: Number(firstRecharge.amount) || 0,
        first_recharge_time: this.formatDateTime(firstRecharge.created_at),
        user_level: computedLevel,
        admin_id: item.bind_admin_id,
        bind_admin_id: item.bind_admin_id,
        salesperson_id: spId,
        bind_salesperson_id: spId,
        salesperson_name: spName,
        total_withdraw_amount: Number(wStat.total_amount) || 0,
        total_withdraw_count: Number(wStat.total_count) || 0,
        created_at: this.formatDateTime(item.user_create_time),
        user_address: address ? `${address.name} ${address.user_phone} ${address.address}` : null,
        user_invite_code: item.user_invite_code,
        parent_id: item.user_referral_id ? (parentMap[item.user_referral_id] || item.user_referral_id) : null,
        is_task_started: item.is_task_started,
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
   * 管理端会员统计
   * 业务员只看自己的，店长看全店的
   * @param {Object} operator 当前操作者 { role, id }
   * @return {Object} 统计数据
   */
  async adminStatistics(operator = {}) {
    const { ctx } = this;
    const { role: operatorRole, id: operatorId } = operator;

    const userWhere = {};
    if (operatorRole === 1) {
      userWhere.bind_admin_id = operatorId;
    } else if (operatorRole === 2) {
      userWhere.bind_salesperson_id = operatorId;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    yesterdayEnd.setMilliseconds(-1);

    const [
      totalUsers, todayNew, yesterdayNew,
      rechargedRows, rechargeCount,
      withdrawRows, withdrawCount,
      todayRechargedRows, todayRechargeCount,
      yesterdayRechargedRows, yesterdayRechargeCount,
      todayWithdrawRows, todayWithdrawCount,
      yesterdayWithdrawRows, yesterdayWithdrawCount,
    ] = await Promise.all([
      ctx.model.User.count({ where: userWhere }),
      ctx.model.User.count({ where: { ...userWhere, created_at: { [Op.gte]: todayStart, [Op.lte]: todayEnd } } }),
      ctx.model.User.count({ where: { ...userWhere, created_at: { [Op.gte]: yesterdayStart, [Op.lte]: yesterdayEnd } } }),

      // 累计充值
      ctx.model.RechargeRequest.findAll({
        attributes: [[ ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('recharge_request.user_id')), 'user_id' ]],
        include: [{
          model: ctx.model.User,
          as: 'user',
          where: userWhere,
          required: true,
          attributes: [],
        }],
        raw: true,
      }),
      ctx.model.RechargeRequest.count({
        include: [{
          model: ctx.model.User,
          as: 'user',
          where: userWhere,
          required: true,
          attributes: [],
        }],
      }),

      // 累计提现
      ctx.model.WithdrawRecord.findAll({
        attributes: [[ ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('withdraw_record.user_id')), 'user_id' ]],
        include: [{
          model: ctx.model.User,
          as: 'user',
          where: userWhere,
          required: true,
          attributes: [],
        }],
        raw: true,
      }),
      ctx.model.WithdrawRecord.count({
        include: [{
          model: ctx.model.User,
          as: 'user',
          where: userWhere,
          required: true,
          attributes: [],
        }],
      }),

      // 今日充值
      ctx.model.RechargeRequest.findAll({
        attributes: [[ ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('recharge_request.user_id')), 'user_id' ]],
        where: { created_at: { [Op.gte]: todayStart, [Op.lte]: todayEnd } },
        include: [{ model: ctx.model.User, as: 'user', where: userWhere, required: true, attributes: [] }],
        raw: true,
      }),
      ctx.model.RechargeRequest.count({
        where: { created_at: { [Op.gte]: todayStart, [Op.lte]: todayEnd } },
        include: [{ model: ctx.model.User, as: 'user', where: userWhere, required: true, attributes: [] }],
      }),

      // 昨日充值
      ctx.model.RechargeRequest.findAll({
        attributes: [[ ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('recharge_request.user_id')), 'user_id' ]],
        where: { created_at: { [Op.gte]: yesterdayStart, [Op.lte]: yesterdayEnd } },
        include: [{ model: ctx.model.User, as: 'user', where: userWhere, required: true, attributes: [] }],
        raw: true,
      }),
      ctx.model.RechargeRequest.count({
        where: { created_at: { [Op.gte]: yesterdayStart, [Op.lte]: yesterdayEnd } },
        include: [{ model: ctx.model.User, as: 'user', where: userWhere, required: true, attributes: [] }],
      }),

      // 今日提现
      ctx.model.WithdrawRecord.findAll({
        attributes: [[ ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('withdraw_record.user_id')), 'user_id' ]],
        where: { created_at: { [Op.gte]: todayStart, [Op.lte]: todayEnd } },
        include: [{ model: ctx.model.User, as: 'user', where: userWhere, required: true, attributes: [] }],
        raw: true,
      }),
      ctx.model.WithdrawRecord.count({
        where: { created_at: { [Op.gte]: todayStart, [Op.lte]: todayEnd } },
        include: [{ model: ctx.model.User, as: 'user', where: userWhere, required: true, attributes: [] }],
      }),

      // 昨日提现
      ctx.model.WithdrawRecord.findAll({
        attributes: [[ ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('withdraw_record.user_id')), 'user_id' ]],
        where: { created_at: { [Op.gte]: yesterdayStart, [Op.lte]: yesterdayEnd } },
        include: [{ model: ctx.model.User, as: 'user', where: userWhere, required: true, attributes: [] }],
        raw: true,
      }),
      ctx.model.WithdrawRecord.count({
        where: { created_at: { [Op.gte]: yesterdayStart, [Op.lte]: yesterdayEnd } },
        include: [{ model: ctx.model.User, as: 'user', where: userWhere, required: true, attributes: [] }],
      }),
    ]);

    return {
      total_users: totalUsers,
      yesterday_new: yesterdayNew,
      today_new: todayNew,

      recharge_users: rechargedRows.length,
      recharge_count: rechargeCount,
      withdraw_users: withdrawRows.length,
      withdraw_count: withdrawCount,

      today_recharge_users: todayRechargedRows.length,
      today_recharge_count: todayRechargeCount,
      yesterday_recharge_users: yesterdayRechargedRows.length,
      yesterday_recharge_count: yesterdayRechargeCount,

      today_withdraw_users: todayWithdrawRows.length,
      today_withdraw_count: todayWithdrawCount,
      yesterday_withdraw_users: yesterdayWithdrawRows.length,
      yesterday_withdraw_count: yesterdayWithdrawCount,
    };
  }

  /**
   * 格式化日期为北京时间字符串（UTC+8）
   * @param {Date|string} date 日期
   * @return {string} 格式化后的时间
   */
  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    // 转换为 UTC 时间戳后加上 8 小时，确保输出北京时间
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const beijing = new Date(utc + 8 * 60 * 60000);
    const pad = n => (n < 10 ? '0' + n : n);
    return beijing.getFullYear() + '-' + pad(beijing.getMonth() + 1) + '-' + pad(beijing.getDate()) + ' ' + pad(beijing.getHours()) + ':' + pad(beijing.getMinutes()) + ':' + pad(beijing.getSeconds());
  }

  /**
   * 检查当前操作者是否有权限访问指定用户
   * @param {number} userId 用户ID
   * @param {Object} operator 当前操作者 { role, id }
   * @return {Object} 用户记录
   */
  async checkMemberAccess(userId, operator = {}) {
    const { ctx } = this;
    const { role: operatorRole, id: operatorId } = operator;

    const user = await this.findUserByCodeOrId(userId);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    // 管理员 unrestricted
    if (operatorRole === 1) return user;

    // 业务员只能访问自己绑定的用户
    if (operatorRole === 2) {
      if (Number(user.admin_id) !== operatorId) {
        ctx.throw(403, '当前角色无权操作该会员');
      }
      return user;
    }

    ctx.throw(403, '当前角色无权操作该会员');
  }

  /**
   * 修改会员备注
   * @param {number} userId 用户ID
   * @param {string} user_remark 备注内容
   * @param {Object} operator 当前操作者
   * @return {Object} 更新后的用户
   */
  async updateMemberRemark(userId, user_remark, operator = {}) {
    const user = await this.checkMemberAccess(userId, operator);
    await user.update({ user_remark: user_remark || '' });
    const result = user.toJSON();
    delete result.user_password;
    delete result.user_withdraw_password;
    return result;
  }

  /**
   * 修改会员状态
   * @param {number} userId 用户ID
   * @param {Object} payload 状态参数 { user_status, is_real, withdrawal_status, temp_withdraw_status }
   * @param {Object} operator 当前操作者
   * @return {Object} 更新后的用户
   */
  async updateMemberStatus(userId, payload, operator = {}) {
    const { ctx } = this;
    const user = await this.checkMemberAccess(userId, operator);
    const updateData = {};

    // user_status：0=正常，1=禁用
    if (payload.user_status !== undefined && payload.user_status !== '') {
      const value = Number(payload.user_status);
      if (![ 0, 1 ].includes(value)) {
        ctx.throw(422, 'user_status 参数只能是 0 或 1');
      }
      updateData.user_status = value;
    }

    // is_real：true=真实用户，false=虚拟用户
    if (payload.is_real !== undefined && payload.is_real !== '') {
      updateData.is_real = payload.is_real === 1 || payload.is_real === true;
    }

    // withdrawal_status：true=可以提现，false=不可提现
    if (payload.withdrawal_status !== undefined && payload.withdrawal_status !== '') {
      updateData.withdrawal_status = payload.withdrawal_status === 1 || payload.withdrawal_status === true;
    }

    // temp_withdraw_status：true=开启，false=关闭
    if (payload.temp_withdraw_status !== undefined && payload.temp_withdraw_status !== '') {
      updateData.temp_withdraw_status = payload.temp_withdraw_status === 1 || payload.temp_withdraw_status === true;
    }

    if (Object.keys(updateData).length === 0) {
      ctx.throw(422, '至少需要修改一个状态字段');
    }

    await user.update(updateData);

    const result = user.toJSON();
    delete result.user_password;
    delete result.user_withdraw_password;

    return {
      user_id: result.user_id,
      user_name: result.user_name,
      user_status: result.user_status,
      is_real: result.is_real,
      withdrawal_status: result.withdrawal_status,
      temp_withdraw_status: result.temp_withdraw_status,
      has_recharged: result.has_recharged,
    };
  }

  /**
   * 修改会员 VIP 等级
   * @param {number} userId 用户ID
   * @param {number} userVipLevel VIP等级
   * @param {Object} operator 当前操作者
   * @return {Object} 更新后的用户信息
   */
  async updateMemberVipLevel(userId, userVipLevel, operator = {}) {
    const { ctx } = this;
    const user = await this.checkMemberAccess(userId, operator);

    ctx.assert(userVipLevel !== undefined, 422, 'VIP等级不能为空');
    const level = Number(userVipLevel);
    // ctx.assert([ 1, 2, 3, 4 ].includes(level), 422, 'VIP等级只能是 1-4'); // VIP等级不再硬编码限制为1-4，根据实际vips表配置

    const updateData = { user_vip: level };

    // 查找对应等级的VIP配置并更新关联的策略ID
    const vipConfig = await ctx.model.Vip.findOne({ where: { vipLv: level } });
    if (vipConfig && vipConfig.policyId) {
      updateData.strategy_id = vipConfig.policyId;
    }

    await user.update(updateData);

    return {
      user_id: user.user_id,
      user_name: user.user_name,
      user_vip: user.user_vip,
      strategy_id: user.strategy_id,
    };
  }

  /**
   * 重置会员登录密码
   * @param {number} userId 用户ID
   * @param {string} user_password 新密码
   * @param {Object} operator 当前操作者
   * @return {Object} 更新后的用户
   */
  async resetMemberPassword(userId, user_password, operator = {}) {
    const { ctx } = this;
    const user = await this.checkMemberAccess(userId, operator);
    ctx.assert(user_password, 422, '密码不能为空');
    const hashedPassword = await ctx.genHash(user_password);
    await user.update({ user_password: hashedPassword });
    return { user_id: user.user_id, user_name: user.user_name };
  }

  /**
   * 重置会员提现密码
   * @param {number} userId 用户ID
   * @param {string} user_withdraw_password 新提现密码
   * @param {Object} operator 当前操作者
   * @return {Object} 更新后的用户
   */
  async resetMemberWithdrawPassword(userId, user_withdraw_password, operator = {}) {
    const { ctx } = this;
    const user = await this.checkMemberAccess(userId, operator);
    ctx.assert(user_withdraw_password, 422, '提现密码不能为空');
    // 提现密码改为明文存储
    await user.update({ user_withdraw_password });
    return { user_id: user.user_id, user_name: user.user_name };
  }

  /**
   * 修改用户提现地址
   * @param {number} userId 用户ID
   * @param {number} withdrawId 提现记录ID
   * @param {string} withdraw_address 提现地址
   * @param {Object} operator 当前操作者
   */
  async modifyUserWithdrawalAddress(userId, withdrawId, withdraw_address, operator = {}) {
    const { ctx } = this;
    const user = await this.checkMemberAccess(userId, operator);

    ctx.assert(withdraw_address, 422, '提现地址不能为空');

    const withdrawRecord = await ctx.model.WithdrawRecord.findOne({
      where: {
        id: withdrawId,
        user_id: user.id,
      },
    });

    ctx.assert(withdrawRecord, 404, '该提现记录不存在或不属于该用户');

    await withdrawRecord.update({ address: withdraw_address });

    return { user_id: user.user_id, withdraw_id: withdrawRecord.id, address: withdrawRecord.address };
  }


  /**
   * 获取会员活跃信息列表
   * @param {number} userId 用户ID
   * @param {Object} query 查询参数
   * @param {Object} operator 当前操作者
   * @return {Object} 分页结果
   */
  async getMemberActiveLogs(userId, query = {}, operator = {}) {
    const { ctx } = this;
    await this.checkMemberAccess(userId, operator);

    const { page = 1, page_size = 10, pageSize } = query;
    const size = Number(pageSize || page_size);
    const pageNum = Math.max(1, Number(page) || 1);

    const activeRecords = [];

    // 注册记录
    const user = await this.findUserByCodeOrId(userId);
    if (user && user.user_create_time) {
      activeRecords.push({
        userName: user.user_name || user.user_phone || null,
        ipaddr: user.user_ip || null,
        loginLocation: user.user_country || await this.resolveIpLocation(user.user_ip),
        msg: '注册成功',
        operTime: this.formatDateTime(user.user_create_time),
        rawTime: new Date(user.user_create_time).getTime(),
      });
    }

    // 登录/退出记录
    const loginLogs = await ctx.model.UserLoginLog.findAll({
      where: { user_id: user ? user.user_id : userId },
      raw: true,
    });
    for (const item of loginLogs) {
      activeRecords.push({
        userName: item.user_name || null,
        ipaddr: item.ip || null,
        loginLocation: item.location || await this.resolveIpLocation(item.ip),
        msg: item.operation || '登录操作',
        operTime: this.formatDateTime(item.create_time),
        rawTime: new Date(item.create_time).getTime(),
      });
    }

    // 按时间倒序排列
    activeRecords.sort((a, b) => b.rawTime - a.rawTime);

    const total = activeRecords.length;
    const offset = (pageNum - 1) * size;
    const list = activeRecords.slice(offset, offset + size).map(item => {
      const result = {};
      for (const key of Object.keys(item)) {
        if (key !== 'rawTime') result[key] = item[key];
      }
      return result;
    });

    return {
      total,
      list,
      pagination: {
        total,
        page: pageNum,
        page_size: size,
        total_pages: Math.ceil(total / size),
      },
    };
  }

  /**
   * 更新用户信息
   * @param {number} id 用户ID
   * @param {Object} payload 更新内容
   * @return {Object} 更新后的用户记录
   */
  async updateProfile(id, payload) {
    const { ctx } = this;
    const user = await this.findUserByCodeOrId(id);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    // 不允许通过此处修改密码和用户名
    const safePayload = {};
    if (payload.user_name !== undefined) safePayload.user_name = payload.user_name;
    if (payload.user_email !== undefined) safePayload.user_email = payload.user_email;
    if (payload.user_avatar !== undefined) safePayload.user_avatar = payload.user_avatar;
    if (payload.user_phone !== undefined) safePayload.user_phone = payload.user_phone;

    await user.update(safePayload);

    const result = user.toJSON();
    delete result.user_password;
    return result;
  }

  /**
   * 获取用户资金记录（充值和提现汇总）
   * @param {number} userId 用户ID
   * @param {Object} query 查询参数
   * @return {Object} 资金记录列表
   */
  async getCapitalLogs(userId, query = {}) {
    const { ctx } = this;
    const { type = 'all', page = 1, pageSize = 10 } = query;

    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 10));

    // 获取充值成功记录
    let rechargeRecords = [];
    let withdrawRecords = [];

    if (type === 'all' || type === 'recharge') {
      const recharges = await ctx.model.RechargeRequest.findAll({
        where: { user_id: userId, status: 1 },
        attributes: [ 'id', 'order_num', 'do_money', 'user_get_money', 'create_time' ],
        order: [[ 'create_time', 'DESC' ]],
        raw: true,
      });
      rechargeRecords = recharges.map(r => ({
        id: r.id,
        type: 'recharge',
        typeName: '充值',
        amount: Number(r.user_get_money),
        originalAmount: Number(r.do_money),
        status: 'success',
        cTime: r.create_time ? new Date(r.create_time).toISOString() : null,
        timestamp: new Date(r.create_time).getTime(),
      }));
    }

    if (type === 'all' || type === 'withdraw') {
      const withdraws = await ctx.model.WithdrawRecord.findAll({
        where: { user_id: userId, status: 1 },
        attributes: [ 'id', 'order_num', 'amount', 'sx_money', 'take_money', 'create_time' ],
        order: [[ 'create_time', 'DESC' ]],
        raw: true,
      });
      withdrawRecords = withdraws.map(w => ({
        id: w.id,
        type: 'withdraw',
        typeName: '提现',
        amount: Number(w.amount),
        sxMoney: Number(w.sx_money),
        takeMoney: Number(w.take_money),
        status: 'success',
        cTime: w.create_time ? new Date(w.create_time).toISOString() : null,
        timestamp: new Date(w.create_time).getTime(),
      }));
    }

    // 合并并按时间排序
    const allRecords = [ ...rechargeRecords, ...withdrawRecords ];
    allRecords.sort((a, b) => b.timestamp - a.timestamp);

    // 分页
    const total = allRecords.length;
    const start = (pageNum - 1) * size;
    const pagedList = allRecords.slice(start, start + size);

    // 移除排序用的 timestamp 字段
    const list = pagedList.map(item => {
      const cloned = { ...item };
      delete cloned.timestamp;
      return cloned;
    });

    return {
      total,
      list,
      pagination: {
        total,
        page: pageNum,
        page_size: size,
        total_pages: Math.ceil(total / size),
      },
    };
  }

  /**
   * 格式化时间
   * @param {Date|string} date 日期
   * @return {string} 格式化后的时间字符串
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = n => (n < 10 ? '0' + n : n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
}

module.exports = UserService;
