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

      // 沿 user_referral_id（存储的是 user_code）递归
      if (!u.user_referral_id) break;
      u = await ctx.model.SysUser.findOne({ where: { user_id: String(u.user_referral_id) } });
    }
    return result;
  }

  /**
   * 通过 user_id 或 username 查找用户
   * @param {string|number} identifier 用户ID或用户名
   * @return {Promise<Object|null>} 用户记录
   */
  async findUserByIdentifier(identifier) {
    const { ctx } = this;
    if (!identifier) return null;

    const user = await ctx.model.SysUser.findOne({
      where: {
        [Op.or]: [
          { user_id: identifier },
          { username: identifier },
        ],
        is_deleted: 0,
      },
    });
    return user;
  }

  /**
   * 格式化用户数据
   * @param {Object} user 用户记录
   * @param {Object} options 选项 { withPassword: boolean }
   * @return {Object} 格式化后的用户数据
   */
  formatUserData(user, options = {}) {
    if (!user) return null;
    const data = user.toJSON ? user.toJSON() : { ...user };

    if (!options.withPassword) {
      delete data.password;
      delete data.totp_secret;
      delete data.totp_recovery_codes;
    }

    return data;
  }

  /**
   * 用户注册
   * @param {Object} payload 注册参数
   * @return {Object} 创建的用户记录
   */
  async register(payload) {
    const { ctx, service } = this;
    const { user_phone, user_password, confirm_password, user_invite_code } = payload;

    // 校验两次密码是否一致
    if (user_password !== confirm_password) {
      ctx.throw(422, '两次输入的密码不一致');
    }

    // 校验手机号是否已注册
    const existPhone = await ctx.model.SysUser.findOne({
      where: { username: user_phone, is_deleted: 0 },
    });
    if (existPhone) {
      ctx.throw(409, '手机号已被注册');
    }

    let inviterUserId = null;
    let shopId = null;
    let salesmanId = null;
    let parentCustomerUserId = null;
    let rootSalesmanUserId = null;
    let rootShopId = null;

    // 如果填写了邀请码，校验并查找上级用户
    if (user_invite_code) {
      const inviter = await ctx.model.SysUser.findOne({
        where: { invite_code: user_invite_code, is_deleted: 0 },
      });
      if (!inviter) {
        ctx.throw(422, '邀请码无效');
      }
      inviterUserId = inviter.user_id;

      // 确定关系逻辑
      if (inviter.user_type === 4) {
        // 邀请人是C端用户
        parentCustomerUserId = inviter.user_id;
        shopId = inviter.shop_id;
        // 查找邀请人的CustomerRelation以获取业务员和店铺信息
        const inviterRelation = await ctx.model.CustomerRelation.findOne({
          where: { c_user_id: inviter.user_id, is_deleted: 0 },
        });
        if (inviterRelation) {
          salesmanId = inviterRelation.salesman_user_id;
          rootSalesmanUserId = inviterRelation.root_salesman_user_id;
          rootShopId = inviterRelation.root_shop_id;
        }
      } else if (inviter.user_type === 3) {
        // 邀请人是业务员
        salesmanId = inviter.user_id;
        shopId = inviter.shop_id;
        rootSalesmanUserId = inviter.user_id;
        rootShopId = inviter.shop_id;
      } else if (inviter.user_type === 2) {
        // 邀请人是店长
        shopId = inviter.shop_id;
        rootShopId = inviter.shop_id;
      }
    }

    // 密码加密
    const hashedPassword = await ctx.genHash(user_password);

    const userData = {
      username: user_phone,
      password: hashedPassword,
      user_withdraw_password: '123456', // 默认提现密码
      phone: user_phone,
      nickname: user_phone,
      inviter_user_id: inviterUserId,
      user_type: 4, // C端用户
      shop_id: shopId,
      status: 1,
      vip_level: 0,
      withdrawal_status: 1, // 默认可提现
      temp_withdraw_status: 1, // 默认开启临时提现
    };

    let updatedUser = null;

    // 使用事务创建用户和关联关系
    const transaction = await ctx.model.transaction();
    try {
      // 创建用户，不包含邀请码
      const user = await ctx.model.SysUser.create(userData, { transaction });

      // 根据新生成的 user_id 生成基于ID的邀请码
      const personalInviteCode = await this.generateInviteCode(user.user_id);
      
      // 更新邀请码
      await user.update({ invite_code: personalInviteCode }, { transaction });

      // 创建关联关系
      if (shopId) {
        await ctx.model.CustomerRelation.create({
          c_user_id: user.user_id,
          parent_customer_user_id: parentCustomerUserId,
          salesman_user_id: salesmanId,
          shop_id: shopId,
          root_salesman_user_id: rootSalesmanUserId,
          root_shop_id: rootShopId,
          bind_type: 3, // 扫码/邀请码绑定
          status: 1,
          bind_time: new Date(),
        }, { transaction });
      }

      // 发放邀请奖励
      if (inviterUserId && shopId) {
        const shopConfig = await ctx.model.ShopConfig.findOne({
          where: { shop_id: shopId },
          transaction,
        });

        if (shopConfig && shopConfig.invite_new_user_reward > 0) {
          const rewardAmount = parseFloat(shopConfig.invite_new_user_reward);

          let inviterWallet = await ctx.model.UserWallet.findOne({
            where: { user_id: inviterUserId },
            transaction,
          });

          if (!inviterWallet) {
            inviterWallet = await ctx.model.UserWallet.create({
              user_id: inviterUserId,
              balance: 0,
              voucher_balance: 0,
            }, { transaction });
          }

          const beforeBalance = parseFloat(inviterWallet.voucher_balance);
          const afterBalance = beforeBalance + rewardAmount;

          await inviterWallet.update({
            voucher_balance: afterBalance,
          }, { transaction });

          await ctx.model.UserWalletLog.create({
            user_id: inviterUserId,
            currency_type: 2, // 1:现金 2:代金券
            log_type: 8, // 假设 8 代表邀请奖励
            amount: rewardAmount,
            before_balance: beforeBalance,
            after_balance: afterBalance,
            remark: `邀请新用户注册奖励, 新用户ID: ${user.user_id}`,
            related_order_id: user.user_id,
          }, { transaction });
        }
      }

      await transaction.commit();

      // 刷新 VIP 等级（根据 shop_id 规则，初始可能为 VIP1）
      if (shopId) {
        await service.vipLevel.refreshUserVip(user.user_id);
      }

      // 重新查询以获取最新数据
      updatedUser = await ctx.model.SysUser.findByPk(user.user_id);

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return this.formatUserData(updatedUser);
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
      const user = await ctx.model.SysUser.findOne({ where: { user_id: code } });
      if (!user) {
        exists = false;
      }
      attempts++;
    }
    return code;
  }

  /**
   * 生成唯一邀请码
   * 规则：用户ID (user_id) + 2位随机纯数字
   * 由于用户ID是唯一的，加上2位随机数能保证绝大概率唯一。
   * 如果遇到碰撞（极小概率），重新生成后2位。
   * @param {string|number} userId 用户的 user_id
   * @return {string} 邀请码
   */
  async generateInviteCode(userId) {
    const { ctx } = this;
    let code;
    let exists = true;
    
    // 如果没有传入 userId，则降级使用原来的随机生成逻辑 (用于非C端或尚未生成ID的场景)
    if (!userId) {
      return await this._generateRandomInviteCode();
    }

    const baseStr = String(userId);

    while (exists) {
      // 随机生成2位数字 (00-99)
      const randomSuffix = String(Math.floor(Math.random() * 100)).padStart(2, '0');
      code = baseStr + randomSuffix;

      const user = await ctx.model.SysUser.findOne({ where: { invite_code: code } });
      if (!user) {
        exists = false;
      }
    }
    return code;
  }

  /**
   * 内部方法：随机生成邀请码（兜底方案）
   * @return {string} 邀请码
   */
  async _generateRandomInviteCode() {
    const { ctx } = this;
    const chars = '0123456789';
    let code;
    let exists = true;
    let length = 6;
    let attempts = 0;

    while (exists) {
      if (attempts >= 10) {
        length++;
        attempts = 0;
      }

      code = '';
      for (let i = 0; i < length; i++) {
        if (i === 0) {
          code += '123456789'.charAt(Math.floor(Math.random() * 9));
        } else {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      }

      const user = await ctx.model.SysUser.findOne({ where: { invite_code: code } });
      if (!user) {
        exists = false;
      }
      attempts++;
    }
    return code;
  }

  /**
   * 根据IP解析地区
   * @param {string} ip IP地址
   * @return {string} 地区信息
   */
  async resolveIpLocation(ip) {
    return this.ctx.service.sysLog.resolveIpLocation(ip);
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

    const logNo = `LL${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const parsedUa = ctx.service.sysLog.resolveUserAgent(ctx.request.header['user-agent']);

    const user = await ctx.model.SysUser.findOne({ where: { username: user_phone } });
    if (!user) {
      await this.recordLoginLog({
        log_no: logNo,
        user_id: 0,
        username: user_phone,
        login_ip: ip,
        device_type: device || parsedUa.deviceType, // 默认未知
        browser: browser || parsedUa.browser,
        os: os || parsedUa.os,
        login_type: 3, // 默认C端H5
        login_result: 0, // 失败
        remark: '登录失败：用户不存在',
      });
      ctx.throw(401, '手机号或密码错误');
    }

    const match = await ctx.compare(user_password, user.password);
    if (!match) {
      await this.recordLoginLog({
        log_no: logNo,
        user_id: user.user_id,
        username: user.username || user_phone,
        login_ip: ip,
        device_type: device || parsedUa.deviceType,
        browser: browser || parsedUa.browser,
        os: os || parsedUa.os,
        login_type: 3,
        login_result: 0,
        remark: '登录失败：密码错误',
      });
      ctx.throw(401, '手机号或密码错误');
    }

    if (user.status !== 1) {
      await this.recordLoginLog({
        log_no: logNo,
        user_id: user.user_id,
        username: user.username || user_phone,
        login_ip: ip,
        device_type: device || parsedUa.deviceType,
        browser: browser || parsedUa.browser,
        os: os || parsedUa.os,
        login_type: 3,
        login_result: 0,
        remark: '登录失败：账号已禁用',
      });
      ctx.throw(403, '账号已被禁用');
    }

    const accessToken = app.jwt.sign(
      { userId: user.user_id, user_phone: user.username, type: 'user' },
      app.config.jwt.secret,
      { expiresIn: app.config.jwt.expiresIn },
    );

    const refreshToken = app.jwt.sign(
      { userId: user.user_id, type: 'user', isRefresh: true },
      app.config.jwt.secret,
      { expiresIn: app.config.jwt.refreshExpiresIn },
    );

    // 每次登录成功时，更新最后登录IP和时间到 sys_user 表，以便后台展示
    await user.update({
      last_login_ip: ip,
      last_login_time: new Date()
    });

    await this.recordLoginLog({
      log_no: logNo,
      user_id: user.user_id,
      username: user.username || user_phone,
      login_ip: ip,
      device_type: device || parsedUa.deviceType,
      browser: browser || parsedUa.browser,
      os: os || parsedUa.os,
      login_type: 3,
      login_result: 1, // 成功
      remark: '登录成功',
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
   * @param {number} id 用户ID或用户名
   * @return {Object|null} 用户记录
   */
  async findById(id) {
    const user = await this.findUserByIdentifier(id);
    if (!user) {
      return null;
    }
    return this.formatUserData(user);
  }

  /**
   * 获取用户邀请码及邀请信息
   * @param {number} id 用户ID
   * @return {Object} 邀请码和邀请收入信息
   */
  async getInviteInfo(id) {
    const { ctx } = this;
    const user = await this.findUserByIdentifier(id);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    // 查找钱包中的邀请收入
    const wallet = await ctx.model.UserWallet.findOne({ where: { user_id: user.user_id } });

    return {
      user_invite_code: user.invite_code,
      user_invite_income: wallet ? wallet.dynamic_income : 0,
    };
  }

  /**
   * 修改登录密码
   * @param {number} id 用户ID（9-12位）或数据库主键ID
   * @param {Object} payload 密码参数
   */
  async updatePassword(id, payload) {
    const { ctx } = this;
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

    const user = await this.findUserByIdentifier(id);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    const match = await ctx.compare(old_password, user.password);
    if (!match) {
      ctx.throw(422, '旧密码错误');
    }

    const hashedPassword = await ctx.genHash(new_password);
    await user.update({ password: hashedPassword });
  }

  /**
   * 修改提现密码
   * @param {number} id 用户ID（9-12位）或数据库主键ID
   * @param {Object} payload 密码参数
   */
  async updateWithdrawPassword(id, payload) {
    const { ctx } = this;
    const old_password = payload.old_password || payload.oldPassword;
    const new_password = payload.new_password || payload.newPassword;
    const confirm_password = payload.confirm_password || payload.confirmPassword;

    ctx.assert(new_password, 422, '新密码不能为空');
    ctx.assert(confirm_password, 422, '确认密码不能为空');
    ctx.assert(new_password.length >= 6, 422, '新密码长度不能少于6位');
    if (new_password !== confirm_password) {
      ctx.throw(422, '两次输入的新密码不一致');
    }

    const user = await this.findUserByIdentifier(id);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    if (user.user_withdraw_password) {
      ctx.assert(old_password, 422, '旧提现密码不能为空');
      const isPlain = !user.user_withdraw_password.startsWith('$2a$');
      const match = isPlain ? old_password === user.user_withdraw_password : await ctx.compare(old_password, user.user_withdraw_password);
      if (!match) {
        ctx.throw(422, '旧提现密码错误');
      }
    }

    await user.update({ user_withdraw_password: new_password });
    return this.formatUserData(user);
  }

  /**
   * 修改用户 VIP 等级
   * @param {number} id 用户ID（9-12位）或数据库主键ID
   * @param {Object} payload VIP参数
   */
  async updateVipLevel(id, payload) {
    const { ctx } = this;
    const { vip_level } = payload;

    ctx.assert(vip_level !== undefined, 422, 'VIP等级不能为空');
    const level = Number(vip_level);

    const user = await this.findUserByIdentifier(id);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    await user.update({ vip_level: level });

    return this.formatUserData(user);
  }

  /**
   * 获取账户余额
   * @param {number} id 用户ID或用户名
   * @return {Object} 余额信息
   */
  async getBalance(id) {
    const { ctx } = this;
    const user = await this.findUserByIdentifier(id);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    const wallet = await ctx.model.UserWallet.findOne({ where: { user_id: user.user_id } });

    return {
      user_id: user.user_id,
      balance: wallet ? wallet.balance : 0,
    };
  }

  /**
   * 获取收货信息
   * @param {number} userId - 用户 ID
   */
  async getReceipt(userId) {
    const user = await this.ctx.model.SysUser.findByPk(userId, {
      attributes: [ 'receipt_name', 'receipt_phone', 'receipt_address' ],
    });
    if (!user) {
      this.ctx.throw(404, '用户不存在');
    }
    return user;
  }

  /**
   * 更新收货信息
   * @param {number} userId - 用户 ID
   * @param {object} params - 包含 receipt_name, receipt_phone, receipt_address
   */
  async updateReceipt(userId, params) {
    const user = await this.ctx.model.SysUser.findByPk(userId);
    if (!user) {
      this.ctx.throw(404, '用户不存在');
    }
    await user.update({
      receipt_name: params.receipt_name,
      receipt_phone: params.receipt_phone,
      receipt_address: params.receipt_address,
    });
    return null;
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
    const user = await ctx.model.SysUser.findByPk(userId, {
      attributes: [ 'user_id', 'vip_level', 'shop_id' ],
    });
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    // 获取钱包余额
    const wallet = await ctx.model.UserWallet.findOne({ where: { user_id: userId } });
    const balance = wallet ? wallet.balance : 0;

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
      user_balance: balance,
      vip_level: user.vip_level,
      task_limit: 30, // 暂时硬编码，后续根据 vip_level 从 shop_vip_level 获取
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

    const { count, rows } = await ctx.model.SysUser.findAndCountAll({
      where: { inviter_user_id: userId, is_deleted: 0, user_type: 4 },
      attributes: [ 'user_id', 'username', 'nickname', 'create_time' ],
      include: [
        {
          model: ctx.model.UserWallet,
          as: 'wallet',
          attributes: [ 'total_recharge_amount', 'dynamic_income' ],
        },
      ],
      order: [[ 'user_id', 'DESC' ]],
      offset,
      limit,
    });

    // 统计汇总
    // 需要通过联表查wallet的总充值和总动态收益
    const allUsers = await ctx.model.SysUser.findAll({
      where: { inviter_user_id: userId, is_deleted: 0, user_type: 4 },
      attributes: [ 'user_id' ],
      include: [
        {
          model: ctx.model.UserWallet,
          as: 'wallet',
          attributes: [ 'total_recharge_amount', 'dynamic_income' ],
        },
      ],
    });

    let totalRecharge = 0;
    allUsers.forEach(u => {
      if (u.wallet) {
        totalRecharge += Number(u.wallet.total_recharge_amount || 0);
      }
    });

    // 计算 statistics.total_invite_income: 当前用户作为上级收到的所有下级贡献的佣金总和
    const totalInviteIncomeStatsResult = await ctx.model.UserWalletLog.sum('amount', {
      where: {
        user_id: userId, // 当前团队用户是佣金接收者
        biz_type: 5,     // 动态收益发放
      },
    });
    const totalInviteIncome = totalInviteIncomeStatsResult || 0;

    // 计算 list 中每个下级贡献的佣金总和 (user_invite_income)
    const subordinateIds = rows.map(item => item.user_id);
    let subordinateContributedIncomeMap = new Map();

    if (subordinateIds.length > 0) {
      // 1. 查出这些下级产生的所有订单进度 ID
      const progressRecords = await ctx.model.ShopTaskUserItemProgress.findAll({
        attributes: ['id', 'user_id'],
        where: {
          user_id: { [ctx.app.Sequelize.Op.in]: subordinateIds },
          status: 1 // 假设状态1为已完成，有收益
        },
        raw: true
      });

      // 构建 map: progressId -> user_id
      const progressToUserMap = new Map();
      progressRecords.forEach(p => {
        progressToUserMap.set(p.id, p.user_id);
      });

      const progressIds = progressRecords.map(p => p.id);

      if (progressIds.length > 0) {
        // 2. 用这些订单进度 ID 查流水 (因为从前的记录 from_user_id 可能为空，只能靠 related_order_id 关联)
        const contributedIncomes = await ctx.model.UserWalletLog.findAll({
          attributes: [
            'related_order_id',
            'amount',
          ],
          where: {
            user_id: userId, // 当前团队用户是佣金接收者
            biz_type: 5,     // 动态收益发放
            related_order_id: { [ctx.app.Sequelize.Op.in]: progressIds },
          },
          raw: true,
        });

        // 3. 将流水金额按产生订单的 user_id 汇总
        contributedIncomes.forEach(item => {
          const fromUserId = progressToUserMap.get(item.related_order_id);
          if (fromUserId) {
            const currentTotal = subordinateContributedIncomeMap.get(fromUserId) || 0;
            subordinateContributedIncomeMap.set(fromUserId, currentTotal + Number(item.amount || 0));
          }
        });
      }
    }

    return {
      list: rows.map(item => ({
        user_id: item.user_id,
        user_name: item.nickname || item.username,
        user_invite_income: subordinateContributedIncomeMap.get(item.user_id) || 0, // 从 Map 中获取该下级贡献的佣金
        total_recharge_amount: item.wallet ? item.wallet.total_recharge_amount : 0,
        create_time: item.create_time,
      })),
      statistics: {
        total_recharge_amount: totalRecharge || 0,
        total_invite_income: totalInviteIncome, // 使用重新计算的佣金总和
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
      user_id, username, nickname, phone, shop_id, vip_level, status,
      page = 1, page_size = 10,
    } = query;

    const where = {
      user_type: 4, // 只返回 C 端用户
      is_deleted: 0,
    };

    if (user_id) where.user_id = user_id;
    if (username) where.username = { [Op.like]: `%${username}%` };
    if (nickname) where.nickname = { [Op.like]: `%${nickname}%` };
    if (phone) where.phone = { [Op.like]: `%${phone}%` };
    if (shop_id) where.shop_id = shop_id;
    if (vip_level !== undefined && vip_level !== '') where.vip_level = vip_level;
    if (status !== undefined && status !== '') where.status = status;

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.SysUser.findAndCountAll({
      where,
      include: [
        {
          model: ctx.model.Shop,
          as: 'shop',
          attributes: [ 'shop_name' ],
        },
      ],
      order: [[ 'user_id', 'DESC' ]],
      offset,
      limit,
    });

    // 查询钱包信息
    const list = await Promise.all(rows.map(async item => {
      const wallet = await ctx.model.UserWallet.findOne({ where: { user_id: item.user_id } });
      const data = item.toJSON();
      data.wallet = wallet || { balance: 0, static_income: 0, dynamic_income: 0, total_recharge_amount: 0 };
      return data;
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

    const userWhere = { user_type: 4, is_deleted: 0 };
    if (operatorRole === 1) {
      // 平台管理员看全平台？或者看自己创建的？
      // 根据规范，B端只能看本店。A端看全平台。
      // 这里逻辑可能需要根据实际权限调整。目前先保持原样但换模型。
    } else if (operatorRole === 2) {
      // 假设 role 2 是商家/业务员？
      // 根据 sys_user.user_type: 1=A, 2=B店家, 3=B业务员, 4=C
      // 如果 operatorRole 是 2 (店家)，应该看 shop_id
      // 如果 operatorRole 是 3 (业务员)，应该看 sales_user_id
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
    ] = await Promise.all([
      ctx.model.SysUser.count({ where: userWhere }),
      ctx.model.SysUser.count({ where: { ...userWhere, create_time: { [Op.gte]: todayStart, [Op.lte]: todayEnd } } }),
      ctx.model.SysUser.count({ where: { ...userWhere, create_time: { [Op.gte]: yesterdayStart, [Op.lte]: yesterdayEnd } } }),
    ]);

    // 统计充值提现
    // 权限过滤逻辑需要根据业务确定，这里先简化为全量或按 shop_id
    const rechargeWhere = {};
    const withdrawWhere = {};

    const [
      rechargeStats, todayRechargeStats, yesterdayRechargeStats,
      withdrawStats, todayWithdrawStats, yesterdayWithdrawStats,
    ] = await Promise.all([
      ctx.model.UserRecharge.findOne({
        attributes: [
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('user_id'))), 'user_count' ],
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.col('id')), 'total_count' ],
        ],
        where: { ...rechargeWhere, status: 2 },
        raw: true,
      }),
      ctx.model.UserRecharge.findOne({
        attributes: [
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('user_id'))), 'user_count' ],
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.col('id')), 'total_count' ],
        ],
        where: { ...rechargeWhere, status: 2, create_time: { [Op.gte]: todayStart, [Op.lte]: todayEnd } },
        raw: true,
      }),
      ctx.model.UserRecharge.findOne({
        attributes: [
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('user_id'))), 'user_count' ],
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.col('id')), 'total_count' ],
        ],
        where: { ...rechargeWhere, status: 2, create_time: { [Op.gte]: yesterdayStart, [Op.lte]: yesterdayEnd } },
        raw: true,
      }),
      ctx.model.UserWithdraw.findOne({
        attributes: [
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('user_id'))), 'user_count' ],
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.col('id')), 'total_count' ],
        ],
        where: { ...withdrawWhere, status: 2 },
        raw: true,
      }),
      ctx.model.UserWithdraw.findOne({
        attributes: [
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('user_id'))), 'user_count' ],
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.col('id')), 'total_count' ],
        ],
        where: { ...withdrawWhere, status: 2, create_time: { [Op.gte]: todayStart, [Op.lte]: todayEnd } },
        raw: true,
      }),
      ctx.model.UserWithdraw.findOne({
        attributes: [
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.fn('DISTINCT', ctx.app.Sequelize.col('user_id'))), 'user_count' ],
          [ ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.col('id')), 'total_count' ],
        ],
        where: { ...withdrawWhere, status: 2, create_time: { [Op.gte]: yesterdayStart, [Op.lte]: yesterdayEnd } },
        raw: true,
      }),
    ]);

    return {
      total_users: totalUsers,
      yesterday_new: yesterdayNew,
      today_new: todayNew,

      recharge_users: Number(rechargeStats.user_count) || 0,
      recharge_count: Number(rechargeStats.total_count) || 0,
      withdraw_users: Number(withdrawStats.user_count) || 0,
      withdraw_count: Number(withdrawStats.total_count) || 0,

      today_recharge_users: Number(todayRechargeStats.user_count) || 0,
      today_recharge_count: Number(todayRechargeStats.total_count) || 0,
      yesterday_recharge_users: Number(yesterdayRechargeStats.user_count) || 0,
      yesterday_recharge_count: Number(yesterdayRechargeStats.total_count) || 0,

      today_withdraw_users: Number(todayWithdrawStats.user_count) || 0,
      today_withdraw_count: Number(todayWithdrawStats.total_count) || 0,
      yesterday_withdraw_users: Number(yesterdayWithdrawStats.user_count) || 0,
      yesterday_withdraw_count: Number(yesterdayWithdrawStats.total_count) || 0,
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
    const { role: operatorRole, id: operatorId, shop_id: shopId } = operator;

    const user = await this.findUserByIdentifier(userId);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    // A端管理员 unrestricted (user_type = 1)
    if (operatorRole === 1) return user;

    // B端店长 (user_type = 2) 或 业务员 (user_type = 3)
    if (operatorRole === 2 || operatorRole === 3) {
      const relation = await ctx.model.CustomerRelation.findOne({
        where: { c_user_id: user.user_id, is_deleted: 0 },
      });

      if (!relation) {
        ctx.throw(403, '当前角色无权操作该会员');
      }

      // 店长：只需属于本店
      if (operatorRole === 2) {
        if (relation.shop_id !== shopId) {
          ctx.throw(403, '当前角色无权操作该会员');
        }
        return user;
      }

      // 业务员：不仅要属于本店，还需要是自己的下级（或直推等）
      // 这里为简单起见，至少校验 shop_id 和 root_salesman_user_id
      // 如果业务员只能看自己直推，这里需要递归，但为了防止深层查询，我们至少校验 root_salesman_user_id
      if (operatorRole === 3) {
        // 先检查店
        if (relation.shop_id !== shopId) {
          ctx.throw(403, '当前角色无权操作该会员');
        }

        // 进一步检查是否在自己的伞下
        let currentUserId = user.user_id;
        let isDescendant = false;
        const maxDepth = 50;
        let depth = 0;

        while (currentUserId && depth < maxDepth) {
          const rel = await ctx.model.CustomerRelation.findOne({
            where: { c_user_id: currentUserId, is_deleted: 0 }
          });
          if (!rel) break;

          if (rel.root_salesman_user_id === operatorId) {
            isDescendant = true;
            break;
          }

          if (rel.parent_customer_user_id) {
            currentUserId = rel.parent_customer_user_id;
          } else {
            break;
          }
          depth++;
        }

        if (!isDescendant) {
          ctx.throw(403, '当前角色无权操作该会员');
        }

        return user;
      }
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
    delete result.password;
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
      updateData.status = value;
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
    delete result.password;
    delete result.user_withdraw_password;

    return {
      user_id: result.user_id,
      user_name: result.username,
      user_status: result.status,
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

    const updateData = { vip_level: level };

    // 查找对应等级的VIP配置并更新关联的策略ID
    const vipConfig = await ctx.model.Vip.findOne({ where: { vipLv: level } });
    if (vipConfig && vipConfig.policyId) {
      updateData.strategy_id = vipConfig.policyId;
    }

    await user.update(updateData);

    return {
      user_id: user.user_id,
      user_name: user.username,
      user_vip: user.vip_level,
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
    await user.update({ password: hashedPassword });
    return { user_id: user.user_id, user_name: user.username };
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
    return { user_id: user.user_id, user_name: user.username };
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

    const withdrawRecord = await ctx.model.UserWithdraw.findOne({
      where: {
        id: withdrawId,
        user_id: user.user_id,
      },
    });

    ctx.assert(withdrawRecord, 404, '该提现记录不存在或不属于该用户');

    await withdrawRecord.update({ user_receive_address: withdraw_address });

    return { user_id: user.user_id, withdraw_id: withdrawRecord.id, address: withdrawRecord.user_receive_address };
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
    const user = await this.findUserByIdentifier(userId);
    if (user && user.create_time) {
      activeRecords.push({
        userName: user.username || user.phone || null,
        ipaddr: user.last_login_ip || null, // 注册IP可能没存，用最后登录IP
        loginLocation: await this.resolveIpLocation(user.last_login_ip),
        msg: '注册成功',
        operTime: this.formatDateTime(user.create_time),
        rawTime: new Date(user.create_time).getTime(),
      });
    }

    // 登录/退出记录
    const loginLogs = await ctx.model.UserLoginLog.findAll({
      where: { user_id: user ? user.user_id : userId },
      raw: true,
    });
    for (const item of loginLogs) {
      activeRecords.push({
        userName: item.username || null,
        ipaddr: item.login_ip || null,
        loginLocation: item.login_location || await this.resolveIpLocation(item.login_ip),
        msg: item.remark || '登录操作',
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
    const user = await this.findUserByIdentifier(id);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    // 不允许通过此处修改密码和用户名
    const safePayload = {};
    if (payload.nickname !== undefined) safePayload.nickname = payload.nickname;
    if (payload.email !== undefined) safePayload.email = payload.email;
    if (payload.avatar !== undefined) safePayload.avatar = payload.avatar;
    if (payload.phone !== undefined) safePayload.phone = payload.phone;

    await user.update(safePayload);

    return this.formatUserData(user);
  }

  /**
   * 获取收货信息
   * @param {number} userId 用户ID
   * @return {Object} 收货信息
   */
  async getReceiptInfo(userId) {
    const { ctx } = this;
    const user = await ctx.model.SysUser.findByPk(userId, {
      attributes: [ 'receipt_name', 'receipt_phone', 'receipt_address' ],
    });
    if (!user) {
      ctx.throw(404, '用户不存在');
    }
    return user.toJSON();
  }

  /**
   * 更新收货信息
   * @param {number} userId 用户ID
   * @param {Object} payload 收货信息参数
   */
  async updateReceiptInfo(userId, payload) {
    const { ctx } = this;
    const { receipt_name, receipt_phone, receipt_address } = payload;

    ctx.assert(receipt_name, 422, '收货人姓名不能为空');
    ctx.assert(receipt_phone, 422, '收货人联系方式不能为空');
    ctx.assert(receipt_address, 422, '收货地址不能为空');

    const user = await ctx.model.SysUser.findByPk(userId);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    await user.update({
      receipt_name,
      receipt_phone,
      receipt_address,
    });
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
      const recharges = await ctx.model.UserRecharge.findAll({
        where: { user_id: userId, status: 2 },
        attributes: [ 'id', 'order_no', 'amount', 'user_receive_amount', 'create_time' ],
        order: [[ 'create_time', 'DESC' ]],
        raw: true,
      });
      rechargeRecords = recharges.map(r => ({
        id: r.id,
        type: 'recharge',
        typeName: '充值',
        amount: Number(r.user_receive_amount),
        originalAmount: Number(r.amount),
        status: 'success',
        cTime: r.create_time ? new Date(r.create_time).toISOString() : null,
        timestamp: new Date(r.create_time).getTime(),
      }));
    }

    if (type === 'all' || type === 'withdraw') {
      const withdraws = await ctx.model.UserWithdraw.findAll({
        where: { user_id: userId, status: 2 },
        attributes: [ 'id', 'order_no', 'amount', 'fee_amount', 'user_receive_amount', 'create_time' ],
        order: [[ 'create_time', 'DESC' ]],
        raw: true,
      });
      withdrawRecords = withdraws.map(w => ({
        id: w.id,
        type: 'withdraw',
        typeName: '提现',
        amount: Number(w.amount),
        sxMoney: Number(w.fee_amount),
        takeMoney: Number(w.user_receive_amount),
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
