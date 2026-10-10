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
      ctx.throw(401, ctx.__('common.not_logged_in'));
    }

    // === 新增：Redis 防重复提交锁（防连点） ===
    const lockKey = `withdraw_lock_${userId}`;
    // 尝试获取锁，设置 3 秒过期时间，NX 表示不存在时才设置成功
    const lock = await app.redis.set(lockKey, '1', 'EX', 3, 'NX');
    if (!lock) {
      ctx.throw(429, ctx.__('common.processing_please_wait'));
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
      ctx.throw(400, ctx.__('withdraw.withdraw_amount_error'));
    }

    const user = await ctx.model.SysUser.findOne({
      where: { user_id: userId },
    });

    // 修复：数据库中提现密码的字段名是 user_withdraw_password
    if (!user || !user.user_withdraw_password) {
      ctx.throw(400, ctx.__('withdraw.please_set_withdraw_pwd'));
    }

    // 验证提现密码 (假设使用 md5，需要根据实际密码加密规则调整)
    const crypto = require('crypto');
    const hashedPwd = crypto.createHash('md5').update(payload.withdraw_pwd).digest('hex');
    // 如果系统使用的是带 salt 的，需调整
    if (user.user_withdraw_password !== hashedPwd && user.user_withdraw_password !== payload.withdraw_pwd) {
      ctx.throw(400, ctx.__('withdraw.withdraw_pwd_error'));
    }

    // 查询用户的归属关系
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: userId },
    });

    if (!relation || !relation.shop_id) {
      ctx.throw(400, ctx.__('shop.user_not_bound_shop_withdraw'));
    }

    // 1. 如果用户的提现状态是未开启状态，则永远提现不了
    if (user.withdrawal_status === 0) {
      ctx.throw(400, 'withdraw.account_restricted_withdraw');
    }

    // 4. 如果用户临时提现状态是开启的情况下，不管什么设置 都可以提现
    const isTempWithdrawAllowed = user.temp_withdraw_status === 1;

    // 如果没有开启临时提现，则需要检查是否有待审核的提现订单
    if (!isTempWithdrawAllowed) {
      const pendingWithdraw = await ctx.model.UserWithdraw.findOne({
        where: { user_id: userId, status: 1 },
      });

      if (pendingWithdraw) {
        ctx.throw(423, ctx.__('withdraw.has_pending_withdraw'));
      }
    }

    // 获取手续费配置
    const shopConfig = await ctx.model.ShopConfig.findOne({
      where: { shop_id: relation.shop_id },
    });

    if (!isTempWithdrawAllowed) {
      // 检查用户任务状态
      const isTaskWithdrawLogicOn = shopConfig && shopConfig.withdraw_first_need_task === 1;

      if (isTaskWithdrawLogicOn) {
        // 开启完成任务提现逻辑：
        // 必须有绑定的模板，且最新绑定的模板状态必须是已完成(2)
        const latestTaskUser = await ctx.model.ShopTaskUser.findOne({
          where: {
            user_id: userId,
          },
          order: [[ 'id', 'DESC' ]],
        });

        // task_status: 0已绑定 1任务进行中 2全部完成 3已过期截止
        // 兼容处理：只要 status == 2 或 task_status == 2 都认为已完成
        if (!latestTaskUser || (latestTaskUser.status !== 2 && latestTaskUser.task_status !== 2)) {
          ctx.throw(400, 'withdraw.tasks_incomplete_withdraw');
        }
      } else {
        // 关闭完成任务提现逻辑：
        // 用户也必须完成一次任务模板后才能提现
        const hasCompletedTemplate = await ctx.model.ShopTaskUser.findOne({
          where: {
            user_id: userId,
            [ctx.app.Sequelize.Op.or]: [
              { status: 2 },
              { task_status: 2 },
            ],
          },
        });

        if (!hasCompletedTemplate) {
          ctx.throw(400, 'withdraw.tasks_incomplete_withdraw');
        }
      }

      // 5. 店铺如果设置了需要完成实名认证后才能提现，就必须完成实名后才能提现
      if (shopConfig && shopConfig.withdraw_first_need_identity === 1) {
        const identity = await ctx.model.UserIdentity.findOne({
          where: {
            user_id: userId,
            audit_status: 2, // 2代表审核通过
          },
        });

        if (!identity) {
          ctx.throw(400, 'withdraw.complete_identity_before_withdraw');
        }
      }
    }

    let fee = 0;
    if (shopConfig) {
      if (payload.amount < shopConfig.withdraw_min_amount) {
        ctx.throw(400, ctx.__('withdraw.withdraw_amount_min'));
      }
      if (payload.amount > shopConfig.withdraw_max_amount) {
        ctx.throw(400, ctx.__('withdraw.withdraw_amount_max'));
      }

      // 没有固定金额的说法，只有提现手续费比例。
      // 如果后台填写 0.03，则手续费 = 金额 * 0.03 (即3%)。
      fee = payload.amount * Number(shopConfig.withdraw_fee_value);
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
        throw new Error(ctx.__('wallet.balance_not_enough'));
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
        freeze_voucher_balance: ctx.app.Sequelize.literal(`freeze_voucher_balance + ${amount}`),
      }, {
        where: { user_id: userId },
        transaction,
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

      // 发送 TG 异步通知
      ctx.runInBackground(async () => {
        try {
          // 查出用户信息获取用户名
          const user = await ctx.model.SysUser.findByPk(userId);
          const userName = user ? (user.username || user.nickname || '未知用户') : '未知用户';

          // 查出业务员信息获取业务员名称
          let salesmanName = '无归属';
          if (relation.salesman_user_id) {
            const salesman = await ctx.model.SysUser.findByPk(relation.salesman_user_id);
            salesmanName = salesman ? (salesman.username || salesman.nickname || '未知业务员') : '未知业务员';
          }

          const msg = `发起提现申请，用户名称：${userName}，提现金额：${Number(payload.amount)}，业务员名称：${salesmanName}`;
          await ctx.service.telegram.sendMessage(msg, relation.shop_id || 0);
        } catch (err) {
          ctx.logger.error('[Telegram] 提现通知发送失败:', err);
        }
      });

      ctx.body = {
        code: 200,
        message: ctx.__('withdraw.withdraw_request_submitted'),
        data: {
          id: withdraw.id,
          order_no: withdraw.order_no,
          status: withdraw.status,
        },
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
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
      message: ctx.__('common.fetch_success'),
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
      ctx.throw(401, ctx.__('common.not_logged_in'));
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
      message: ctx.__('common.fetch_success'),
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
