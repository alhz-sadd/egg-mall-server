'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-提现
 * 移动端提现请求控制器
 */
class MobileWithdrawController extends Controller {
  /**
   * @summary 创建提现请求
   * @description 移动端用户发起提现请求
   * @router post /api/mobile/withdraws
   * @request header string Authorization Bearer token
   * @request body WithdrawCreateRequest *body 提现请求信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, app } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    if (!userId) {
      ctx.throw(401, '未登录');
    }

    const payload = ctx.request.body;
    
    // 如果前端传过来的 amount 是字符串，先转为数字，避免 validate 类型校验报错
    if (payload.amount !== undefined) {
      payload.amount = Number(payload.amount);
    }
    
    // 兼容前端传参字段 user_withdraw_password
    if (payload.user_withdraw_password !== undefined && payload.withdraw_pwd === undefined) {
      payload.withdraw_pwd = payload.user_withdraw_password;
    }

    ctx.validate({
      channel_code: { type: 'string', required: true },
      withdraw_address: { type: 'string', required: true },
      amount: { type: 'number', required: true },
      withdraw_pwd: { type: 'string', required: true },
    }, payload);

    if (payload.amount <= 0) {
      ctx.throw(400, '提现金额必须大于0');
    }

    const user = await ctx.model.SysUser.findOne({
      where: { user_id: userId },
    });

    // 修复：数据库中提现密码的字段名是 user_withdraw_password
    if (!user || !user.user_withdraw_password) {
      ctx.throw(400, '请先设置提现密码');
    }

    // 验证提现密码 (假设使用 md5，需要根据实际密码加密规则调整)
    const crypto = require('crypto');
    const hashedPwd = crypto.createHash('md5').update(payload.withdraw_pwd).digest('hex');
    // 如果系统使用的是带 salt 的，需调整
    if (user.user_withdraw_password !== hashedPwd && user.user_withdraw_password !== payload.withdraw_pwd) {
      ctx.throw(400, '提现密码错误');
    }

    // 查询用户的归属关系
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: userId },
    });

    if (!relation || !relation.shop_id) {
      ctx.throw(400, '当前用户未绑定店铺，无法提现');
    }

    // 获取手续费配置
    const shopConfig = await ctx.model.ShopConfig.findOne({
      where: { shop_id: relation.shop_id },
    });

    let fee = 0;
    if (shopConfig) {
      if (payload.amount < shopConfig.withdraw_min_amount) {
        ctx.throw(400, `提现金额不能低于 ${shopConfig.withdraw_min_amount}`);
      }
      if (payload.amount > shopConfig.withdraw_max_amount) {
        ctx.throw(400, `提现金额不能高于 ${shopConfig.withdraw_max_amount}`);
      }

      // 假设 withdraw_fee_type 1为比例（如0.03表示3%），2为固定金额
      if (shopConfig.withdraw_fee_type === 1) {
        fee = payload.amount * Number(shopConfig.withdraw_fee_value);
      } else {
        fee = Number(shopConfig.withdraw_fee_value);
      }
    }
    const actualReceiveAmount = payload.amount - fee;

    const transaction = await ctx.model.transaction();
    try {
      // 检查并扣除余额
      const wallet = await ctx.model.UserWallet.findOne({
        where: { user_id: userId },
        transaction,
      });

      if (!wallet || Number(wallet.balance) < payload.amount) {
        throw new Error('可用余额不足');
      }

      const amount = payload.amount;
      const currentRecharge = Number(wallet.recharge_balance || 0);
      let deductRecharge = 0;
      let deductVoucher = 0;
      if (currentRecharge >= amount) {
        deductRecharge = amount;
      } else {
        deductRecharge = currentRecharge;
        deductVoucher = amount - currentRecharge;
      }

      // C端发起提现，先将申请提现的金额移入冻结资产
      await ctx.model.UserWallet.update({
        balance: ctx.app.Sequelize.literal(`balance - ${amount}`),
        recharge_balance: ctx.app.Sequelize.literal(`recharge_balance - ${deductRecharge}`),
        voucher_balance: ctx.app.Sequelize.literal(`voucher_balance - ${deductVoucher}`),
        freeze_voucher_balance: ctx.app.Sequelize.literal(`freeze_voucher_balance + ${amount}`)
      }, {
        where: { user_id: userId },
        transaction
      });

      const orderNo = 'WD' + Date.now() + Math.floor(Math.random() * 10000).toString().padStart(4, '0');

      const withdraw = await ctx.model.UserWithdraw.create({
        order_no: orderNo,
        shop_id: relation.shop_id,
        sales_user_id: relation.salesman_user_id,
        user_id: userId,
        channel_code: payload.channel_code,
        channel_name: payload.channel_code,
        withdraw_address: payload.withdraw_address,
        amount: payload.amount,
        fee,
        actual_receive_amount: actualReceiveAmount,
        status: 1, // 待审核
      }, { transaction });

      // 记录流水
      await ctx.model.UserWalletLog.create({
        user_id: userId,
        biz_type: 2, // 提现
        related_order_id: withdraw.id, // 修复字段名
        log_no: withdraw.order_no, // 使用提现订单号作为流水号
        amount: -payload.amount,
        balance_type: 1, // 'voucher_balance' 对应枚举可能是 1，或者传 1
        before_balance: Number(wallet.balance),
        after_balance: Number(wallet.balance) - payload.amount,
        remark: '发起提现，扣除可用余额',
      }, { transaction });

      await transaction.commit();

      ctx.body = {
        code: 200,
        message: '提现申请已提交',
        data: {
          id: withdraw.id,
          order_no: withdraw.order_no,
          status: withdraw.status,
        },
      };
    } catch (err) {
      await transaction.rollback();
      ctx.throw(500, err.message || '提现申请失败');
    }
  }

  /**
   * 获取提现记录列表
   */
  async list() {
    const { ctx } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;
    const { page = 1, page_size = 10, status } = ctx.query;

    const where = { user_id: userId };
    
    // 如果 status 存在，且不为 0 (0表示全部)，则加入查询条件
    if (status !== undefined && status !== '' && parseInt(status) !== 0) {
      where.status = parseInt(status);
    }

    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;

    const result = await ctx.model.UserWithdraw.findAndCountAll({
      where,
      limit,
      offset,
      order: [[ 'create_time', 'DESC' ]],
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        list: result.rows,
        total: result.count,
        page: parseInt(page),
        page_size: limit,
      },
    };
  }

  /**
   * 获取提现配置
   */
  async getConfig() {
    const { ctx } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    if (!userId) {
      ctx.throw(401, '未登录或登录状态已失效');
    }

    const user = await ctx.model.SysUser.findOne({
      where: { user_id: userId },
    });

    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: userId },
    });

    const wallet = await ctx.model.UserWallet.findOne({ where: { user_id: userId } });

    let feeType = 1;
    let feeValue = 0;
    let withdrawMinAmount = 0;
    let withdrawMaxAmount = 0;
    let withdrawFirstNeedTask = 0;
    let withdrawFirstNeedIdentity = 0;

    let channels = [];

    if (relation && relation.shop_id) {
      const shopConfig = await ctx.model.ShopConfig.findOne({
        where: { shop_id: relation.shop_id },
      });
      if (shopConfig) {
        feeType = shopConfig.withdraw_fee_type;
        feeValue = shopConfig.withdraw_fee_value;
        withdrawMinAmount = shopConfig.withdraw_min_amount;
        withdrawMaxAmount = shopConfig.withdraw_max_amount;
        withdrawFirstNeedTask = shopConfig.withdraw_first_need_task;
        withdrawFirstNeedIdentity = shopConfig.withdraw_first_need_identity;
      }

      // 获取店铺启用的提现渠道
      const payChannels = await ctx.model.ShopPayChannel.findAll({
        where: {
          shop_id: relation.shop_id,
          channel_type: 2, // 2 表示提现
          is_enable: 1, // 启用状态
        },
        order: [[ 'sort', 'ASC' ], [ 'id', 'ASC' ]],
      });

      channels = payChannels.map(item => ({
        channel_code: item.channel_code,
        channel_name: item.channel_name,
      }));
    }

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        has_withdraw_pwd: !!(user && user.user_withdraw_password),
        withdraw_fee_type: feeType,
        withdraw_fee_value: feeValue,
        withdraw_min_amount: withdrawMinAmount,
        withdraw_max_amount: withdrawMaxAmount,
        withdraw_first_need_task: withdrawFirstNeedTask,
        withdraw_first_need_identity: withdrawFirstNeedIdentity,
        balance: wallet ? wallet.balance : 0, // 新增：用户余额
        channels,
      },
    };
  }
}

module.exports = MobileWithdrawController;
