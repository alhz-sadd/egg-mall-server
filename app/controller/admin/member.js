'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-会员管理
 * 管理端获取手机端注册用户列表及相关操作
 */
class MemberController extends Controller {
  /**
   * 记录操作日志
   * @param {string} action 动作
   * @param {string} description 描述
   * @param {number} status 状态
   * @param {number} duration 消耗时间（毫秒）
   */
  async recordOperation(action, description, status = 1, duration = 0) {
    const { ctx, service } = this;
    const admin = ctx.state.admin || {};

    await service.adminUser.recordOperationLog({
      admin_id: admin.adminId || null,
      username: admin.username || '',
      module: '会员管理',
      action,
      description,
      ip: ctx.ip || '127.0.0.1',
      location: '未知',
      duration,
      status,
    });
  }

  /**
   * @summary 获取手机端注册用户列表
   * @description 管理端获取业务员/手机端注册用户列表，包含统计和分页
   * @router get /api/admin/members
   * @request header string Authorization Bearer admin token
   * @request query integer id 用户UID
   * @request query integer parent_id 上级UID
   * @request query string username 账号（模糊查询）
   * @request query string phone 手机号码（模糊查询）
   * @request query integer salesperson_id 业务员UID
   * @request query integer user_level 用户层级
   * @request query string register_ip 注册IP（模糊查询）
   * @request query integer has_recharged 是否充值：0已充值 1未充值
   * @request query integer is_real 真人/假人：0真人 1假人
   * @request query string sort_by_asset 资产排序：balance_asc 升序 balance_desc 降序
   * @request query integer status 用户状态：0启用 1禁用
   * @request query string start_time 注册时间开始（如 2026-07-01）
   * @request query string end_time 注册时间结束（如 2026-07-31）
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 用户列表
   */
  async index() {
    const { ctx, service } = this;
    const {
      id, parent_id, username, phone, salesperson_id, user_level, register_ip,
      has_recharged, is_real, sort_by_asset, status, start_time, end_time, page, page_size,
    } = ctx.query;
    const startTime = Date.now();

    const operator = ctx.state.admin || {};
    if (!operator.adminId) {
      ctx.throw(401, '未授权访问');
    }

    const result = await service.user.adminList({
      id,
      parent_id,
      username,
      phone,
      salesperson_id,
      user_level,
      register_ip,
      has_recharged,
      is_real,
      sort_by_asset,
      status,
      start_time,
      end_time,
      page,
      page_size,
    }, {
      role: operator.role,
      id: operator.adminId,
    });

    await this.recordOperation('查询', '查询会员列表', 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取会员统计数据
   * @description 单独接口获取会员统计：总注册量、昨日新增、今日新增、充值人数、充值次数、提现人数、提现次数
   * @router get /api/admin/members/statistics
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 统计数据
   */
  async statistics() {
    const { ctx, service } = this;
    const operator = ctx.state.admin || {};
    const startTime = Date.now();

    const result = await service.user.adminStatistics({
      role: operator.role,
      id: operator.adminId,
    });

    await this.recordOperation('查询', '查询会员统计数据', 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 修改会员备注
   * @description 管理端修改指定会员的备注字段
   * @router put /api/admin/members/:id/remark
   * @request header string Authorization Bearer admin token
   * @request path integer id 会员ID
   * @request body UpdateMemberRemarkRequest *body 备注参数
   * @response 200 ApiResponse 修改成功
   */
  async updateRemark() {
    const { ctx, service } = this;
    const userId = Number(ctx.params.id);
    const { remark } = ctx.request.body;
    const operator = ctx.state.admin || {};

    const result = await service.user.updateMemberRemark(userId, remark, {
      role: operator.role,
      id: operator.adminId,
    });

    await this.recordOperation('修改', `修改会员备注，用户ID：${userId}`, 1);

    ctx.body = {
      code: 200,
      message: '修改成功',
      data: result,
    };
  }

  /**
   * @summary 修改会员状态
   * @description 切换会员状态字段，参数与响应语义一致：
   *   - user_status: 用户状态，0=正常，1=禁用
   *   - is_real: 是否真实用户，true=真实用户，false=虚拟用户
   *   - withdrawal_status: 提现状态，true=可以提现，false=不可提现
   *   - temp_withdraw_status: 临时提现状态，true=开启，false=关闭
   * @router put /api/admin/members/:id/status
   * @request header string Authorization Bearer admin token
   * @request path integer id 会员ID
   * @request body UpdateMemberStatusRequest *body 状态参数
   * @response 200 ApiResponse 修改成功
   */
  async updateStatus() {
    const { ctx, service } = this;
    const userId = Number(ctx.params.id);
    const { user_status, is_real, withdrawal_status, temp_withdraw_status } = ctx.request.body;
    const operator = ctx.state.admin || {};

    const result = await service.user.updateMemberStatus(userId, {
      user_status,
      is_real,
      withdrawal_status,
      temp_withdraw_status,
    }, {
      role: operator.role,
      id: operator.adminId,
    });

    await this.recordOperation('修改', `修改会员状态，用户ID：${userId}`, 1);

    ctx.body = {
      code: 200,
      message: '修改成功',
      data: result,
    };
  }

  /**
   * @summary 修改会员 VIP 等级
   * @description VIP等级范围 1-4
   * @router put /api/admin/members/:id/vip-level
   * @request header string Authorization Bearer admin token
   * @request path integer id 会员ID
   * @request body UpdateMemberVipLevelRequest *body VIP等级参数
   * @response 200 ApiResponse 修改成功
   */
  async updateVipLevel() {
    const { ctx, service } = this;
    const userId = Number(ctx.params.id);
    const { vip_level } = ctx.request.body;
    const operator = ctx.state.admin || {};

    const result = await service.user.updateMemberVipLevel(userId, vip_level, {
      role: operator.role,
      id: operator.adminId,
    });

    await this.recordOperation('修改', `修改会员VIP等级，用户ID：${userId}，VIP等级：${vip_level}`, 1);

    ctx.body = {
      code: 200,
      message: '修改成功',
      data: result,
    };
  }

  /**
   * @summary 获取会员资金明细列表
   * @description 查询指定会员的佣金收入、充值、提现等资金明细
   * @router get /api/admin/members/:id/fund-details
   * @request header string Authorization Bearer admin token
   * @request path integer id 会员ID
   * @request query integer type 操作类型：0团队收益 1佣金收入 3充值 4提现
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 资金明细列表
   */
  async fundDetails() {
    const { ctx, service } = this;
    const userId = Number(ctx.params.id);
    const operator = ctx.state.admin || {};

    const result = await service.fundRecord.getFundDetails(userId, ctx.query, operator);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 重置会员登录密码
   * @description 管理端重置指定会员的登录密码
   * @router post /api/admin/members/:id/reset-password
   * @request header string Authorization Bearer admin token
   * @request path integer id 会员ID
   * @request body ResetMemberPasswordRequest *body 重置密码参数
   * @response 200 ApiResponse 重置成功
   */
  async resetPassword() {
    const { ctx, service } = this;
    const userId = Number(ctx.params.id);
    const { userPassword } = ctx.request.body;
    const operator = ctx.state.admin || {};

    const result = await service.user.resetMemberPassword(userId, userPassword, {
      role: operator.role,
      id: operator.adminId,
    });

    await this.recordOperation('修改', `重置会员登录密码，用户ID：${userId}`, 1);

    ctx.body = {
      code: 200,
      message: '重置成功',
      data: result,
    };
  }

  /**
   * @summary 重置会员提现密码
   * @description 管理端重置指定会员的提现密码
   * @router post /api/admin/members/:id/reset-withdraw-password
   * @request header string Authorization Bearer admin token
   * @request path integer id 会员ID
   * @request body ResetMemberWithdrawPasswordRequest *body 重置提现密码参数
   * @response 200 ApiResponse 重置成功
   */
  async resetWithdrawPassword() {
    const { ctx, service } = this;
    const userId = Number(ctx.params.id);
    const { user_withdraw_password } = ctx.request.body;
    const operator = ctx.state.admin || {};

    ctx.assert(user_withdraw_password !== undefined && user_withdraw_password !== '', 422, '新提现密码不能为空');

    const result = await service.user.resetMemberWithdrawPassword(userId, user_withdraw_password, {
      role: operator.role,
      id: operator.adminId,
    });

    await this.recordOperation('修改', `重置会员提现密码，用户ID：${userId}`, 1);

    ctx.body = {
      code: 200,
      message: '重置成功',
      data: result,
    };
  }

  /**
   * @summary 获取会员活跃信息列表
   * @description 查询指定会员的注册、登录等活跃记录
   * @router get /api/admin/members/:id/active-logs
   * @request header string Authorization Bearer admin token
   * @request path integer id 会员ID
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 活跃信息列表
   */
  async activeLogs() {
    const { ctx, service } = this;
    const userId = Number(ctx.params.id);
    const operator = ctx.state.admin || {};

    const result = await service.user.getMemberActiveLogs(userId, ctx.query, {
      role: operator.role,
      id: operator.adminId,
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 添加会员金额
   * @description 管理端直接添加会员余额，需要 googleCode 二级密码验证
   * @router post /api/admin/members/add-balance
   * @request header string Authorization Bearer admin token
   * @request body AddMemberBalanceRequest *body 添加金额参数
   * @response 200 ApiResponse 添加成功
   */
  async addBalance() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    const operator = ctx.state.admin || {};
    const startTime = Date.now();

    // 验证 googleCode
    const admin = await ctx.model.AdminUser.findByPk(operator.adminId);
    ctx.assert(admin, 401, '管理员不存在');

    if (admin.google_code) {
      ctx.assert(body.googleCode, 422, 'googleCode不能为空');
      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: admin.google_code,
        encoding: 'base32',
        token: body.googleCode,
        window: 1,
      });

      if (!verified) {
        ctx.throw(422, 'googleCode验证失败');
      }
    }

    // 验证参数
    ctx.assert(body.user_id, 422, '用户ID不能为空');
    ctx.assert(body.money !== undefined && body.money !== null, 422, '金额不能为空');
    const money = Number(body.money);
    ctx.assert(money > 0, 422, '金额必须大于0');
    ctx.assert([ '0', '1', '2' ].includes(String(body.type)), 422, '操作类型只能是 0-赠送 1-员工添加 2-通道充值');

    const result = await service.recharge.adminCreate({
      user_id: Number(body.user_id),
      amount: money,
      type: body.type,
      remark: body.remark || '',
    }, operator.adminId);

    await this.recordOperation('添加金额', `添加会员金额，用户ID：${body.user_id}，金额：${money}`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '添加成功',
      data: result,
    };
  }

  /**
   * @summary 扣除会员金额
   * @description 管理端直接扣除会员余额，需要 googleCode 二级密码验证
   * @router post /api/admin/members/deduct-balance
   * @request header string Authorization Bearer admin token
   * @request body DeductMemberBalanceRequest *body 扣除金额参数
   * @response 200 ApiResponse 扣除成功
   */
  async deductBalance() {
    const { ctx, service } = this;
    const body = ctx.request.body;
    const operator = ctx.state.admin || {};
    const startTime = Date.now();

    // 验证 googleCode
    const admin = await ctx.model.AdminUser.findByPk(operator.adminId);
    ctx.assert(admin, 401, '管理员不存在');

    if (admin.google_code) {
      ctx.assert(body.googleCode, 422, 'googleCode不能为空');
      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: admin.google_code,
        encoding: 'base32',
        token: body.googleCode,
        window: 1,
      });

      if (!verified) {
        ctx.throw(422, 'googleCode验证失败');
      }
    }

    // 验证参数
    ctx.assert(body.user_id, 422, '用户ID不能为空');
    ctx.assert(body.money !== undefined && body.money !== null, 422, '金额不能为空');
    const money = Number(body.money);
    ctx.assert(money > 0, 422, '金额必须大于0');

    const user = await service.user.findUserByCodeOrId(body.user_id);
    ctx.assert(user, 422, '用户不存在');

    // 检查余额是否足够
    const userBalance = Number(user.user_balance) || 0;
    ctx.assert(userBalance >= money, 422, `用户余额不足，当前余额：${userBalance.toFixed(2)}`);

    // 扣除余额
    await user.decrement('user_balance', { by: money });

    // 创建扣除记录（使用 recharge_record 表，类型为扣除）
    const record = await ctx.model.RechargeRecord.create({
      user_id: user.id, // 使用主键ID
      operator_id: operator.adminId,
      operation_type: 3, // 3表示扣除
      amount: -money,
      recharge_type: 3, // 3表示管理扣除
      status: 1,
      recharge_date: new Date(),
      remark: body.remark || '',
    });

    await this.recordOperation('扣除金额', `扣除会员金额，用户ID：${body.user_id}，金额：${money}`, 1, Date.now() - startTime);

    ctx.body = {
      code: 200,
      message: '扣除成功',
      data: {
        id: record.id,
        userId: body.user_id,
        money,
        balance: (userBalance - money).toFixed(2),
        remark: body.remark || '',
      },
    };
  }

  /**
   * @summary 修改用户提现地址
   * @description 管理端修改指定用户的提现地址
   * @router post /api/admin/ModifyUserWithdrawalAddress
   * @request header string Authorization Bearer admin token
   * @request body ModifyWithdrawalAddressRequest *body 修改提现地址参数
   * @response 200 ApiResponse 修改成功
   */
  async modifyWithdrawalAddress() {
    const { ctx, service } = this;
    const { user_id, withdraw_id, withdraw_address } = ctx.request.body;
    const operator = ctx.state.admin || {};

    ctx.assert(user_id, 422, 'user_id不能为空');
    ctx.assert(withdraw_id, 422, 'withdraw_id不能为空');
    ctx.assert(withdraw_address, 422, 'withdraw_address不能为空');

    await service.user.modifyUserWithdrawalAddress(user_id, withdraw_id, withdraw_address, {
      role: operator.role,
      id: operator.adminId,
    });

    await this.recordOperation('修改', `修改用户提现地址，用户ID：${user_id}，提现ID：${withdraw_id}`, 1);

    ctx.body = {
      code: 200,
      msg: '修改成功',
    };
  }
}

module.exports = MemberController;
