'use strict';

const Controller = require('egg').Controller;

class AdminOuterCustomerController extends Controller {
  /**
   * 获取店铺的C端用户列表
   */
  async index() {
    const { ctx, service } = this;
    const { user_id, user_type, shop_id } = ctx.state.adminOuter || {};

    if (!user_id || !shop_id) {
      ctx.throw(401, '登录状态异常，缺少必要信息');
    }

    try {
      const result = await service.adminOuterCustomer.getCustomerList(ctx.query, { user_id, user_type, shop_id });
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[AdminOuterCustomerController.index] 获取C端用户列表失败', error);
      ctx.body = {
        code: 500,
        message: '获取C端用户列表失败',
        data: null,
      };
    }
  }

  /**
   * 店长/业务员手动添加C端用户（辅助注册）
   */
  async create() {
    const { ctx, service } = this;
    const { user_id, user_type, shop_id } = ctx.state.adminOuter || {};

    if (!user_id || !shop_id) {
      ctx.throw(401, '登录状态异常，缺少必要信息');
    }

    const { username, password, phone } = ctx.request.body;

    ctx.assert(username, 422, '用户名/手机号不能为空');
    ctx.assert(password, 422, '密码不能为空');

    // 默认如果没传 phone 就用 username
    const registerPhone = phone || username;

    // 根据当前登录人，获取其推广码
    const promoRecord = await ctx.model.SalesmanPromoCode.findOne({
      where: { user_id, enable: 1 },
    });

    if (!promoRecord) {
      ctx.throw(403, '当前账号未配置推广码，无法添加用户');
    }

    // 调用专属的添加C端用户服务完成注册（仅写入 sys_user 及新表）
    try {
      const result = await service.adminOuterCustomer.createCustomer({
        phone: registerPhone,
        password,
        promo_code: promoRecord.promo_code,
        ip: ctx.ip,
      }, { user_id, user_type, shop_id });

      ctx.body = {
        code: 200,
        message: '添加用户成功',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[AdminOuterCustomerController.create] 添加C端用户失败', error);
      ctx.throw(error.status || 500, error.message || '添加C端用户失败');
    }
  }

  /**
   * 编辑 C 端客户信息(提现配置、备注)
   */
  async update() {
    const { ctx, service } = this;
    const userId = ctx.params.id;
    const payload = ctx.request.body;

    if (!userId) {
      ctx.throw(400, '缺少用户ID参数');
    }

    const currentUser = ctx.state.adminOuter;
    await service.adminOuterCustomer.updateCustomer(userId, payload, currentUser);

    ctx.body = {
      code: 200,
      message: '修改成功',
      data: null,
    };
  }

  /**
   * 获取C端用户活跃信息
   */
  async activeInfo() {
    const { ctx, service } = this;
    const { shop_id } = ctx.state.adminOuter || {};
    const { customer_user_id } = ctx.query;

    if (!shop_id) {
      ctx.throw(401, '登录状态异常，缺少店铺信息');
    }

    if (!customer_user_id) {
      ctx.throw(400, '缺少参数 customer_user_id');
    }

    try {
      const result = await service.customer.getActiveInfo(customer_user_id, shop_id);
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[AdminOuterCustomerController.activeInfo] 获取C端用户活跃信息失败', error);
      ctx.throw(error.status || 500, error.message || '获取C端用户活跃信息失败');
    }
  }

  /**
   * 获取C端用户登录操作日志列表
   */
  async loginLogList() {
    const { ctx, service } = this;
    const { shop_id } = ctx.state.adminOuter || {};
    const customerUserId = ctx.params.customerUserId;
    const { pageNum = 1, pageSize = 10 } = ctx.query;

    if (!shop_id) {
      ctx.throw(401, '登录状态异常，缺少店铺信息');
    }

    if (!customerUserId) {
      ctx.throw(400, '缺少参数 customerUserId');
    }

    try {
      const result = await service.customer.getLoginLogList(customerUserId, pageNum, pageSize, shop_id);
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[AdminOuterCustomerController.loginLogList] 获取C端用户登录日志失败', error);
      ctx.throw(error.status || 500, error.message || '获取C端用户登录日志失败');
    }
  }

  /**
   * 获取C端用户层级关系
   */
  async relationTree() {
    const { ctx } = this;
    const { customerUserId } = ctx.params;
    const { pageNum = 1, pageSize = 10 } = ctx.query;
    // B端必须校验店铺权限
    const shopId = ctx.state.adminOuter.shop_id;

    if (!customerUserId) {
      ctx.throw(400, '用户ID不能为空');
    }

    const data = await ctx.service.customer.getRelationTree(
      customerUserId,
      shopId,
      pageNum,
      pageSize,
    );

    ctx.body = {
      code: 200,
      message: '获取成功',
      data,
    };
  }

  // 1. 获取店铺下的C端用户统计 (仅B端)
  async statistics() {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    const adminOuter = ctx.state.adminOuter;
    const shop_id = adminOuter.shop_id;

    // 昨天和今天的起止时间
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
    const yesterdayStart = new Date(new Date(todayStart).setDate(todayStart.getDate() - 1));
    const yesterdayEnd = new Date(new Date(todayEnd).setDate(todayEnd.getDate() - 1));

    // 查询该店铺下的所有C端用户ID
    const relations = await ctx.model.CustomerRelation.findAll({
      where: { shop_id },
      attributes: [ 'c_user_id' ],
    });
    const userIds = relations.map(r => r.c_user_id);

    if (userIds.length === 0) {
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: {
          register: { total: 0, yesterday: 0, today: 0 },
          recharge: { people: 0, count: 0 },
          withdraw: { people: 0, count: 0 },
        },
      };
      return;
    }

    // 1. 注册统计
    const registerTotal = userIds.length;
    const registerYesterday = await ctx.model.SysUser.count({
      where: {
        user_id: { [Op.in]: userIds },
        create_time: { [Op.between]: [ yesterdayStart, yesterdayEnd ] },
      },
    });
    const registerToday = await ctx.model.SysUser.count({
      where: {
        user_id: { [Op.in]: userIds },
        create_time: { [Op.between]: [ todayStart, todayEnd ] },
      },
    });

    // 2. 充值统计 (假设状态2为审核通过/成功)
    const rechargeOrders = await ctx.model.UserRecharge.findAll({
      where: {
        user_id: { [Op.in]: userIds },
        status: 2,
      },
      attributes: [ 'user_id' ],
    });
    const rechargePeople = new Set(rechargeOrders.map(o => o.user_id)).size;
    const rechargeCount = rechargeOrders.length;

    // 3. 提现统计 (假设状态2为审核通过/成功)
    const withdrawOrders = await ctx.model.UserWithdraw.findAll({
      where: {
        user_id: { [Op.in]: userIds },
        status: 2,
      },
      attributes: [ 'user_id' ],
    });
    const withdrawPeople = new Set(withdrawOrders.map(o => o.user_id)).size;
    const withdrawCount = withdrawOrders.length;

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        register: {
          total: registerTotal,
          yesterday: registerYesterday,
          today: registerToday,
        },
        recharge: {
          people: rechargePeople,
          count: rechargeCount,
        },
        withdraw: {
          people: withdrawPeople,
          count: withdrawCount,
        },
      },
    };
  }

  /**
   * 获取C端用户资金明细
   */
  async fundDetails() {
    const { ctx, service } = this;
    const userId = ctx.params.id;
    const adminOuter = ctx.state.adminOuter;

    if (!userId) {
      ctx.throw(400, '缺少用户ID参数');
    }

    try {
      const data = await service.fundRecord.getFundDetails(userId, ctx.query, {
        role: adminOuter.user_type, // B端角色
        adminId: adminOuter.user_id,
        shop_id: adminOuter.shop_id, // 传递 shop_id 用于权限校验
      });

      ctx.body = {
        code: 200,
        message: '获取成功',
        data,
      };
    } catch (error) {
      ctx.logger.error('[AdminOuterCustomerController.fundDetails] 获取资金明细失败:', error);
      ctx.throw(error.status || 500, error.message || '获取资金明细失败');
    }
  }

  /**
   * 后台资金充值与扣除
   */
  async updateBalance() {
    const { ctx } = this;
    const userId = ctx.params.id;
    const { amount, change_type, remark } = ctx.request.body;
    const adminOuter = ctx.state.adminOuter;

    if (!userId) {
      ctx.throw(400, '缺少用户ID参数');
    }

    if (!amount || Number(amount) <= 0) {
      ctx.throw(400, '变动金额必须大于0');
    }

    if (![ 1, 2 ].includes(Number(change_type))) {
      ctx.throw(400, '无效的操作类型');
    }

    // 校验权限
    await ctx.service.user.checkMemberAccess(userId, {
      role: adminOuter.user_type,
      id: adminOuter.user_id,
      shop_id: adminOuter.shop_id,
    });

    const wallet = await ctx.model.UserWallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      ctx.throw(404, '用户钱包不存在');
    }

    if (Number(change_type) === 2 && Number(wallet.voucher_balance) < Number(amount)) {
      ctx.throw(400, '用户钱包余额不足，无法扣除');
    }

    const transaction = await ctx.model.transaction();
    try {
      const before_balance = Number(wallet.voucher_balance);
      const after_balance = Number(change_type) === 1 
        ? before_balance + Number(amount)
        : before_balance - Number(amount);

      if (Number(change_type) === 1) {
        await wallet.increment('voucher_balance', { by: Number(amount), transaction });
      } else {
        await wallet.decrement('voucher_balance', { by: Number(amount), transaction });
      }

      const log_no = `B_BAL_${Date.now()}`;
      
      await ctx.model.UserWalletLog.create({
        user_id: userId,
        log_no,
        biz_type: Number(change_type) === 1 ? 8 : 9, // 8: 人工上分, 9: 人工下分
        amount: Number(change_type) === 1 ? Number(amount) : -Number(amount),
        balance_type: 2, // 员工添加/扣除
        before_balance,
        after_balance,
        remark: remark || (Number(change_type) === 1 ? '后台充值' : '后台扣除'),
      }, { transaction });

      await transaction.commit();

      ctx.body = {
        code: 200,
        message: Number(change_type) === 1 ? '充值成功' : '扣除成功',
      };
    } catch (error) {
      await transaction.rollback();
      ctx.logger.error('[AdminOuterCustomerController.updateBalance] 操作失败:', error);
      ctx.throw(500, '操作失败：' + error.message);
    }
  }

  /**
   * 重置C端用户登录密码
   */
  async resetPassword() {
    const { ctx } = this;
    const userId = ctx.params.id;
    const { user_password } = ctx.request.body;
    const adminOuter = ctx.state.adminOuter;

    if (!userId) {
      ctx.throw(400, '缺少用户ID参数');
    }

    if (!user_password) {
      ctx.throw(400, '新密码不能为空');
    }

    // 校验权限
    await ctx.service.user.checkMemberAccess(userId, {
      role: adminOuter.user_type,
      id: adminOuter.user_id,
      shop_id: adminOuter.shop_id,
    });

    const user = await ctx.model.SysUser.findOne({ where: { user_id: userId, user_type: 4 } });
    if (!user) {
      ctx.throw(404, 'C端用户不存在');
    }

    // Hash the new password
    const hashedPassword = await ctx.genHash(user_password);
    await user.update({ password: hashedPassword });

    ctx.body = {
      code: 200,
      message: '密码重置成功',
      data: null,
    };
  }

  /**
   * 修改客户提现密码
   */
  async updateWithdrawPassword() {
    const { ctx, service } = this;
    const userId = ctx.params.id;
    const { withdraw_pwd } = ctx.request.body;
    const adminOuter = ctx.state.adminOuter;

    if (!userId) {
      ctx.throw(400, '缺少用户ID参数');
    }
    if (!withdraw_pwd) {
      ctx.throw(400, '新提现密码不能为空');
    }

    await service.user.resetMemberWithdrawPassword(userId, withdraw_pwd, {
      role: adminOuter.user_type,
      id: adminOuter.user_id,
      shop_id: adminOuter.shop_id,
    });

    ctx.body = {
      code: 200,
      message: '提现密码修改成功',
      data: null,
    };
  }

  /**
     * 获取用户当前绑定策略的详情以及对应的策略规则列表
     */
    async policy() {
      const { ctx } = this;
      const userId = ctx.params.id;
      const adminOuter = ctx.state.adminOuter;

      if (!userId) {
        ctx.throw(400, '缺少用户ID参数');
      }

      // 校验权限
      await ctx.service.user.checkMemberAccess(userId, {
        role: adminOuter.user_type,
        id: adminOuter.user_id,
        shop_id: adminOuter.shop_id,
      });

      // 1. 从 shop_task_user 表查询用户绑定的任务 (最新的)
      const userTask = await ctx.model.ShopTaskUser.findOne({
        where: { user_id: userId },
        order: [['create_time', 'DESC']],
      });

      if (!userTask) {
        return ctx.body = {
          code: 200,
          message: '获取成功',
          data: null, // 无绑定任务
        };
      }

      // 2. 根据 task_id 查询主任务模板信息
      const taskInfo = await ctx.model.ShopTask.findOne({
        where: { task_id: userTask.task_id }
      });

      // 3. 查询任务的子项列表
      const taskItems = await ctx.model.ShopTaskItem.findAll({
        where: { task_id: userTask.task_id, is_deleted: 0 },
        order: [['item_id', 'ASC']]
      });

      // 4. 查询该用户的进度
      const progressItems = await ctx.model.ShopTaskUserItemProgress.findAll({
        where: { user_task_id: userTask.id, user_id: userId }
      });

      // 5. 组装返回数据
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: {
          task_id: taskInfo ? taskInfo.task_id : null,
          task_name: taskInfo ? taskInfo.task_name : '未知任务',
          task_status: userTask.task_status, // 0已绑定 1任务进行中 2全部完成 3已过期截止
          items: taskItems.map((item, index) => {
            // 找到对应的进度记录
            const progress = progressItems.find(p => p.task_item_id === item.item_id);
            return {
              sort_num: index + 1, // 当前子项的序列号 (1, 2, 3...)
              item_id: item.item_id,
              is_lucky_order: item.is_lucky_order,
              rule_type: item.rule_type,
              yield_rate: item.yield_rate,
              append_amount: item.append_amount,
              goods_price: item.goods_price,
              goods_title: item.goods_title,
              goods_id: item.goods_id,
              // 用户进度数据
                progress_status: progress ? progress.status : 0, // 0未完成 1已完成
                  progress_revenue: progress ? progress.revenue : 0,
                  is_triggered: progress ? progress.is_triggered : 0, // 订单是否已触发：0否 1是
                  is_processing: progress ? progress.is_processing : 0, // 是否正在进行中：0否 1是
                  create_time: (progress && progress.create_time) ? progress.create_time : userTask.create_time, // 如果没有进度表记录，则回退为绑定时间
                  update_time: (progress && progress.update_time) ? progress.update_time : userTask.create_time, // 同上，未完成更新前也默认展示绑定时间
                };
              })
          }
      };
    }
}

module.exports = AdminOuterCustomerController;
