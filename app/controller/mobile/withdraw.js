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
    const userId = Number(ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId);

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

    // 1. 最高状态第一：如果用户的提现状态是未开启状态，则永远提现不了
    if (user.withdrawal_status === 0) {
      ctx.throw(400, 'withdraw.account_restricted_withdraw');
    }

    // 获取手续费配置
    const shopConfig = await ctx.model.ShopConfig.findOne({
      where: { shop_id: relation.shop_id },
    });

    // 必须遵守的要求：店铺设置的提现最低/高金额限制
    // 这是最最最基础的提现要求，不管临时提现是否开启，都必须优先遵守
    let fee = 0;
    if (shopConfig) {
      if (payload.amount < shopConfig.withdraw_min_amount) {
        ctx.throw(400, ctx.__('withdraw.withdraw_amount_min'));
      }
      if (payload.amount > shopConfig.withdraw_max_amount) {
        ctx.throw(400, ctx.__('withdraw.withdraw_amount_max'));
      }

      // 没有固定金额的说法，只有提现手续费比例。
      fee = payload.amount * Number(shopConfig.withdraw_fee_value);
    }

    const transaction = await ctx.model.transaction();
    try {
      // 1. 在事务最开始就获取钱包行级锁 (FOR UPDATE)
      // 这一步彻底锁死用户的钱包余额，防止时间差/脚本并发导致重复提现或绕过提现规则。
      // 在这个锁释放之前，任何需要操作余额的接口（支付订单、提现）都必须等待。
      const wallet = await ctx.model.UserWallet.findOne({
        where: { user_id: userId },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!wallet || Number(wallet.balance) < payload.amount) {
        ctx.throw(400, ctx.__('wallet.balance_not_enough'));
      }

      // 最高状态第二：临时提现打开，允许任务中，下级还没完成任务下提现
      const isTempWithdrawAllowed = user.temp_withdraw_status === 1;

      // 2. 将提现的业务规则校验，全部移动到加锁后的事务中进行
      // 这样即便用户利用并发脚本，提现请求也必须串行执行，读到的任务状态是绝对准确的
      if (!isTempWithdrawAllowed) {
        // 优先检查是否有待审核的提现订单，如果有，应该优先提示“有待审核的提现订单”
        const pendingWithdraw = await ctx.model.UserWithdraw.findOne({
          where: { user_id: userId, status: 1 },
          transaction,
        });

        if (pendingWithdraw) {
          ctx.throw(400, ctx.__('withdraw.has_pending_withdraw'));
        }

        // 规则4：未绑定任务的用户，需要绑定任务模板，开启完成后才能提现
        const anyTask = await ctx.model.ShopTaskUser.findOne({
          where: { 
            user_id: userId,
            status: { [ctx.app.Sequelize.Op.ne]: 2 } // 必须有非作废的任务记录
          },
          transaction,
        });

        if (!anyTask) {
          ctx.throw(400, ctx.__('withdraw.tasks_incomplete_withdraw'));
        }

        // 规则1：用户自身，绑定了任务，不管是否开启任务，都必须完成
        // (注意：status 为 2 代表已被后台作废或强制覆盖的历史任务，不算做有效绑定)
        const unfinishedTask = await ctx.model.ShopTaskUser.findOne({
          where: { 
            user_id: userId,
            [ctx.app.Sequelize.Op.or]: [
              { task_status: { [ctx.app.Sequelize.Op.in]: [0, 1] } },
              { status: 1 } // 兼容脏数据
            ],
            status: {
              [ctx.app.Sequelize.Op.ne]: 2 // 排除已作废的历史任务
            },
            task_status: {
              [ctx.app.Sequelize.Op.ne]: 2 // 绝对排除已经完成的任务
            }
          },
          transaction,
        });

        if (unfinishedTask) {
          ctx.throw(400, ctx.__('withdraw.tasks_incomplete_withdraw'));
        }

        // 规则2：任务中，只需要有一单还没支付就不允许提现
        const uncompletedItemCount = await ctx.model.ShopTaskUserItemProgress.count({
          where: { 
            user_id: userId,
            status: 0 // 0表示未完成/未支付
          },
          transaction,
        });

        if (uncompletedItemCount > 0) {
          ctx.throw(400, ctx.__('withdraw.tasks_incomplete_withdraw'));
        }

        // 规则3：自属下级，开启任务后，下级任务未完成的，也是需要完成所有任务订单
        // 用户明确规则：只有下级开启任务才作为条件。绑定未开启(0)允许，已开启完成(2)允许，只有已开启未完成(1)不允许
        // 【注意】系统的底层状态可能存在 status=1(进行中) 但 task_status=0 的脏数据或并发状态，所以需要兼容这两种表示进行中的状态
        const activeSubTask = await ctx.model.ShopTaskUser.findOne({
          include: [{
            model: ctx.model.SysUser,
            as: 'user',
            attributes: [],
            where: {
              inviter_user_id: userId,
              is_deleted: 0,
            },
          }],
          where: {
            // 满足以下任一条件即认为下级任务在进行中：
            // 1. task_status = 1 (标准的进行中)
            // 2. status = 1 (开启任务时某些旧代码或并发逻辑只改了 status 没改 task_status)
            [ctx.app.Sequelize.Op.or]: [
              { task_status: 1 },
              { status: 1 }
            ],
            // 但必须排除掉真正已经全部完成的 (task_status = 2) 和被作废的 (status = 2)
            task_status: { [ctx.app.Sequelize.Op.ne]: 2 },
            status: { [ctx.app.Sequelize.Op.ne]: 2 }
          },
          transaction,
        });

        if (activeSubTask) {
          ctx.throw(400, ctx.__('withdraw.tasks_incomplete_withdraw'));
        }

        // 店铺如果设置了需要完成实名认证后才能提现，就必须完成实名后才能提现
        if (shopConfig && shopConfig.withdraw_first_need_identity === 1) {
          const identity = await ctx.model.UserIdentity.findOne({
            where: {
              user_id: userId,
              audit_status: 2, // 2代表审核通过
            },
            transaction,
          });

          if (!identity) {
            ctx.throw(400, ctx.__('withdraw.complete_identity_before_withdraw'));
          }
        }
      }

      const actualReceiveAmount = payload.amount - fee;
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

      // 临时提现是一次性的：只要用户提现成功，就立即关闭临时提现特权，下次提现需再次开启
      if (isTempWithdrawAllowed) {
        await ctx.model.SysUser.update({
          temp_withdraw_status: 0,
        }, {
          where: { user_id: userId },
          transaction,
        });
      }

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

    // 强制禁用移动端 GET 请求缓存
    ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    ctx.set('Pragma', 'no-cache');
    ctx.set('Expires', '0');

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

    // 强制禁用移动端 GET 请求缓存
    ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    ctx.set('Pragma', 'no-cache');
    ctx.set('Expires', '0');

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
