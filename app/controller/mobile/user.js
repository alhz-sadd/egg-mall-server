'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-用户相关
 * 移动端用户控制器
 */
class UserController extends Controller {
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
    
    // 强制从请求头中获取真实 IP，兼容 Nginx、CDN 和框架获取不到的情况
    let ip = ctx.get('X-Real-IP') || ctx.get('X-Forwarded-For') || ctx.get('REMOTE-HOST') || ctx.ip || ctx.request.ip || '127.0.0.1';
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim(); // 如果有多个 IP (经过多层代理)，取第一个真实客户端 IP
    }
    
    // 我们必须知道 Egg.js 到底收到了什么头，所以写到绝对路径下
    const fs = require('fs');
    try {
      const logPath = '/www/wwwlogs/ip-debug.log'; // 强制写到宝塔的日志目录下
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] Headers: ${JSON.stringify(ctx.request.headers)} | IP: ${ip}\n`);
    } catch(e) {}
    
    const userAgent = ctx.get('user-agent') || '';
    const { device, browser, os } = this.parseUserAgent(userAgent);

    return {
      ip,
      device,
      browser,
      os,
    };
  }

  /**
   * @summary 用户注册
   * @description 使用手机号、密码、确认密码、邀请码进行注册
   * @router post /api/mobile/users/register
   * @request body RegisterRequest *body 注册信息
   * @response 200 ApiResponse 注册成功
   */
  async register() {
    const { ctx, service } = this;
    const { phone, password, confirm_password, invite_code, user_phone, user_password, user_invite_code } = ctx.request.body;

    // 兼容两种参数名
    const registerPhone = user_phone || phone;
    const registerPassword = user_password || password;
    const registerInviteCode = user_invite_code || invite_code;

    // 基础参数校验
    ctx.assert(registerPhone, 422, '手机号不能为空');
    ctx.assert(registerPassword, 422, '密码不能为空');
    ctx.assert(registerPassword.length >= 6, 422, '密码长度不能少于6位');
    ctx.assert(confirm_password, 422, '确认密码不能为空');

    // 获取注册 IP
    let clientIp = ctx.get('X-Real-IP') || ctx.get('X-Forwarded-For') || ctx.ip || ctx.request.ip || '127.0.0.1';
    if (clientIp && clientIp.includes(',')) {
      clientIp = clientIp.split(',')[0].trim();
    }

    const user = await service.user.register({
      user_phone: registerPhone,
      user_password: registerPassword,
      confirm_password,
      user_invite_code: registerInviteCode,
      user_ip: clientIp,
    });

    ctx.body = {
      code: 200,
      message: '注册成功',
      data: user,
    };
  }

  /**
   * @summary 用户登录
   * @description 使用手机号和密码登录，返回 JWT Token
   * @router post /api/mobile/users/login
   * @request body LoginRequest *body 登录信息
   * @response 200 ApiResponse 登录成功
   */
  async login() {
    const { ctx, service } = this;
    const { phone, password, user_phone, user_password } = ctx.request.body;

    // 兼容两种参数名：phone/password 或 user_phone/user_password
    const loginPhone = user_phone || phone;
    const loginPassword = user_password || password;

    ctx.assert(loginPhone, 422, '手机号不能为空');
    ctx.assert(loginPassword, 422, '密码不能为空');

    const meta = this.getLoginMeta();
    const result = await service.user.login({ user_phone: loginPhone, user_password: loginPassword }, meta);

    ctx.body = {
      code: 200,
      message: '登录成功',
      data: result,
    };
  }

  /**
   * @summary 用户退出登录
   * @description 退出登录并记录退出日志（前端需清除本地 token）
   * @router post /api/mobile/users/logout
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 退出成功
   */
  async logout() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;
    const meta = this.getLoginMeta();

    await service.user.recordLoginLog({
      user_id: userId,
      operation: '退出成功',
      status: 0,
      ...meta,
    });

    ctx.body = {
      code: 200,
      message: '退出成功',
      data: null,
    };
  }

  /**
   * @summary 获取当前登录用户信息
   * @description 获取当前登录用户的详细信息
   * @router get /api/mobile/users/current
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 用户信息
   */
  async current() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const user = await service.user.findById(userId);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    // 补充 VIP 等级详情
    if (user.shop_id && user.vip_level !== undefined) {
      const vipInfo = await service.vipLevel.getVipLevelDetails(user.shop_id, user.vip_level);
      user.vip_name = vipInfo ? vipInfo.level_name : '普通用户';
      user.vip_benefit = vipInfo ? vipInfo.benefit : '';
    } else {
      user.vip_name = '普通用户';
      user.vip_benefit = '';
    }

    // 补充用户余额
    const wallet = await ctx.model.UserWallet.findOne({ where: { user_id: userId } });
    user.balance = wallet ? wallet.balance : 0;

    ctx.body = {
      code: 200,
      message: 'success',
      data: user,
    };
  }

  /**
   * @summary 获取当前用户邀请码及邀请收入
   * @description 返回当前用户的邀请码和邀请收入统计
   * @router get /api/mobile/users/invite-code
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 邀请信息
   */
  async inviteCode() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const result = await service.user.getInviteInfo(userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 修改当前用户 VIP 等级
   * @description 修改当前用户的 VIP 等级（1-4）
   * @router put /api/mobile/users/vip-level
   * @request header string Authorization Bearer token
   * @request body UpdateVipLevelRequest *body VIP 等级信息
   * @response 200 ApiResponse 修改成功
   */
  async updateVipLevel() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const user = await service.user.updateVipLevel(userId, ctx.request.body);

    ctx.body = {
      code: 200,
      message: 'VIP等级修改成功',
      data: user,
    };
  }

  /**
   * @summary 获取当前用户账户余额
   * @description 返回当前用户的账户余额
   * @router get /api/mobile/users/balance
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 余额信息
   */
  async balance() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const result = await service.user.getBalance(userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取当前用户物流地址
   * @description 返回当前用户保存的物流地址
   * @router get /api/mobile/users/logistics-address
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 物流地址
   */
  async logisticsAddress() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const result = await service.user.getLogisticsAddress(userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 创建或修改当前用户物流地址
   * @description 创建或更新当前用户的物流地址
   * @router put /api/mobile/users/logistics-address
   * @request header string Authorization Bearer token
   * @request body LogisticsAddressRequest *body 物流地址信息
   * @response 200 ApiResponse 保存成功
   */
  async saveLogisticsAddress() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const result = await service.user.saveLogisticsAddress(userId, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '物流地址保存成功',
      data: result,
    };
  }

  /**
   * @summary 删除当前用户物流地址
   * @description 删除当前用户的物流地址
   * @router delete /api/mobile/users/logistics-address
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 删除成功
   */
  async deleteLogisticsAddress() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    await service.user.deleteLogisticsAddress(userId);

    ctx.body = {
      code: 200,
      message: '物流地址删除成功',
      data: null,
    };
  }

  /**
   * @summary 上传当前用户凭证
   * @description 上传当前用户的凭证信息
   * @router post /api/mobile/users/credential
   * @request header string Authorization Bearer token
   * @request body CredentialRequest *body 凭证信息
   * @response 200 ApiResponse 上传成功
   */
  async uploadCredential() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const result = await service.user.uploadCredential(userId, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '凭证上传成功',
      data: result,
    };
  }

  /**
   * @summary 删除当前用户凭证
   * @description 删除当前用户的凭证
   * @router delete /api/mobile/users/credential
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 删除成功
   */
  async deleteCredential() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    await service.user.deleteCredential(userId);

    ctx.body = {
      code: 200,
      message: '凭证删除成功',
      data: null,
    };
  }

  /**
   * @summary 获取我的任务统计
   * @description 返回当前用户的任务统计数据
   * @router get /api/mobile/users/my-tasks
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 任务统计
   */
  async myTasks() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const result = await service.user.getMyTasks(userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取我的团队
   * @description 获取当前用户的团队列表及统计信息，支持分页
   * @router get /api/mobile/users/team
   * @request header string Authorization Bearer token
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 团队信息
   */
  async team() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;
    const { page, page_size } = ctx.query;

    const result = await service.user.getTeam(userId, { page, page_size });

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取当前用户收货信息
   * @description 返回当前用户保存的收货信息
   * @router get /api/mobile/users/receipt
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 收货信息
   */
  async getReceipt() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const result = await service.user.getReceipt(userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 创建或修改当前用户收货信息
   * @description 创建或更新当前用户的收货信息
   * @router put /api/mobile/users/receipt
   * @request header string Authorization Bearer token
   * @request body ReceiptRequest *body 收货信息
   * @response 200 ApiResponse 保存成功
   */
  async updateReceipt() {
    const { ctx, service } = this;
    const rule = {
      receipt_name: { type: 'string', required: true, message: '收货人姓名必填' },
      receipt_phone: { type: 'string', required: true, message: '收货人手机号必填' },
      receipt_address: { type: 'string', required: true, message: '收货地址必填' },
    };
    ctx.validate(rule);
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const result = await service.user.updateReceipt(userId, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '收货信息保存成功',
      data: result,
    };
  }

  /**
   * @summary 修改当前用户登录密码
   * @description 使用旧密码、新密码、确认密码修改登录密码
   * @router put /api/mobile/users/password
   * @request header string Authorization Bearer token
   * @request body UpdatePasswordRequest *body 密码信息
   * @response 200 ApiResponse 修改成功
   */
  async updatePassword() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    await service.user.updatePassword(userId, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '登录密码修改成功',
      data: null,
    };
  }

  /**
   * @summary 修改当前用户提现密码
   * @description 使用旧密码、新密码、确认密码修改提现密码
   * @router put /api/mobile/users/withdraw-password
   * @request header string Authorization Bearer token
   * @request body UpdatePasswordRequest *body 密码信息
   * @response 200 ApiResponse 修改成功
   */
  async updateWithdrawPassword() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    await service.user.updateWithdrawPassword(userId, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '提现密码修改成功',
      data: null,
    };
  }

  /**
   * @summary 更新当前用户信息
   * @description 更新当前用户的昵称、头像等资料
   * @router put /api/mobile/users/profile
   * @request header string Authorization Bearer token
   * @request body UpdateProfileRequest *body 用户资料
   * @response 200 ApiResponse 更新成功
   */
  async updateProfile() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const user = await service.user.updateProfile(userId, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: user,
    };
  }

  /**
   * @summary 获取当前用户收货信息
   * @description 返回当前用户保存的收货人姓名、手机号和详细地址
   * @router get /api/mobile/users/receipt-info
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 收货信息
   */
  async getReceiptInfo() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const result = await service.user.getReceiptInfo(userId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 提交当前用户收货地址
   * @description 更新当前用户的收货人姓名、手机号和详细地址
   * @router put /api/mobile/users/receipt-info
   * @request header string Authorization Bearer token
   * @request body ReceiptInfoRequest *body 收货信息
   * @response 200 ApiResponse 保存成功
   */
  async updateReceiptInfo() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    await service.user.updateReceiptInfo(userId, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '收货信息保存成功',
      data: null,
    };
  }

  /**
   * @summary 获取资金记录
   * @description 获取当前用户的充值和提现记录汇总
   * @router get /api/mobile/users/capital-logs
   * @request header string Authorization Bearer token
   * @request query integer type 类型：all全部 recharge充值 withdraw提现
   * @request query integer page 页码，默认1
   * @request query integer pageSize 每页数量，默认10
   * @response 200 ApiResponse 资金记录列表
   */
  async capitalLogs() {
    const { ctx, service } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    const result = await service.user.getCapitalLogs(userId, ctx.query);

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: result,
    };
  }

  /**
   * @summary 获取用户资产记录
   * @description 移动端 h5 用户获取用户资产记录
   * @router get /api/mobile/getUserRevenue
   * @request header string Authorization Bearer token
   * @response 200 ApiResponse 资产记录列表
   */
  async getUserRevenue() {
    const { ctx, service } = this;
    try {
      const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

      // 调用统一的资金明细服务获取数据
      const result = await service.fundRecord.getFundDetails(userId, ctx.query);

      // 映射到接口规范所需的数据结构
      const formattedData = result.list.map(item => ({
        remark: item.remark || '',
        ids: null,
        googleCode: null,
        revenueId: item.revenue_id,
        userId: String(item.user_id), // 用户id
        orderNum: item.order_no || '',
        type: String(item.type),
        doMoney: item.doMoney,
        beforeMoney: String(item.beforeMoney || 0),
        afterMoney: String(item.afterMoney || 0),
        status: null,
        cTime: item.create_time,
        uTime: item.create_time,
      }));

      ctx.body = {
        total: result.pagination.total,
        data: {
          list: formattedData,
          total_revenue: result.total_revenue || 0,
        },
        code: 200,
        status: true,
        msg: null,
      };
    } catch (err) {
      ctx.logger.error('Error in /api/mobile/getUserRevenue', err);
      ctx.status = 200;
      ctx.body = {
        code: err.status || 500,
        message: err.message,
        data: null
      };
    }
  }
  /**
   * TEMPORARY: Create Mobile User (REMOVE AFTER USE)
   */
  async createMobileUser() {
    const { ctx } = this;
    const { username, password } = ctx.request.body;

    ctx.assert(username, 422, '账号不能为空');
    ctx.assert(password, 422, '密码不能为空');

    const crypto = require('crypto');
    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

    const user = await ctx.model.SysUser.create({
      username,
      password: hashedPassword,
      user_type: 4, // C端用户
      status: 1,
      nickname: username,
    });

    // Get the shop created in dev/create-outer-admin
    const shop = await ctx.model.Shop.findOne({
      order: [[ 'shop_id', 'DESC' ]],
    });

    if (shop) {
      await ctx.model.CustomerRelation.create({
        c_user_id: user.user_id,
        shop_id: shop.shop_id || 1, // 使用主键id
        sales_user_id: 1, // dummy
        bind_type: 1, // 数据库里是int
        is_active: 1,
      });
    }

    ctx.body = {
      code: 200,
      message: 'C端账号创建成功',
      data: user.toJSON(),
    };
  }
}

module.exports = UserController;
