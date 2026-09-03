'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

/**
 * 任务服务层
 */
class TaskService extends Service {
  /**
   * 获取任务列表
   * @param {Object} query 查询参数
   * @return {Object} 分页结果
   */
  async list(query = {}) {
    const { ctx } = this;
    const { keyword, page = 1, page_size = 10 } = query;

    const where = { status: 1 };
    if (keyword) {
      where.title = { [Op.like]: `%${keyword}%` };
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.Task.findAndCountAll({
      where,
      order: [[ 'sort', 'DESC' ], [ 'id', 'DESC' ]],
      offset,
      limit,
    });

    return {
      list: rows,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 管理端任务列表
   * 返回全部状态，支持状态筛选
   * @param {Object} query 查询参数
   * @return {Object} 分页结果
   */
  async adminList(query = {}) {
    const { ctx } = this;
    const { keyword, status, price_min, price_max, page = 1, page_size = 10 } = query;

    const where = {};
    if (keyword) {
      where.title = { [Op.like]: `%${keyword}%` };
    }
    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }
    if (price_min !== undefined || price_max !== undefined) {
      where.price = {};
      if (price_min !== undefined) {
        where.price[Op.gte] = Number(price_min);
      }
      if (price_max !== undefined) {
        where.price[Op.lte] = Number(price_max);
      }
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.Task.findAndCountAll({
      where,
      order: [[ 'sort', 'DESC' ], [ 'id', 'DESC' ]],
      offset,
      limit,
    });

    const list = rows.map(item => {
      const json = item.toJSON ? item.toJSON() : item;
      return {
        ...json,
        productName: json.title,
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

  /**
   * 获取任务详情
   * @param {number} id 任务ID
   * @return {Object} 任务详情
   */
  async detail(id) {
    const { ctx } = this;
    const task = await ctx.model.Task.findByPk(id);
    if (!task || task.status !== 1) {
      ctx.throw(404, '任务不存在或已禁用');
    }
    return task;
  }

  /**
   * 创建任务
   * @param {Object} payload 任务数据
   * @return {Object} 创建后的任务
   */
  async create(payload) {
    const { ctx } = this;
    this.validatePayload(payload);

    const task = await ctx.model.Task.create(payload);
    return task.toJSON();
  }

  /**
   * 更新任务
   * @param {number} id 任务ID
   * @param {Object} payload 任务数据
   * @return {Object} 更新后的任务
   */
  async update(id, payload) {
    const { ctx } = this;
    const task = await ctx.model.Task.findByPk(id);
    if (!task) {
      ctx.throw(404, '任务不存在');
    }

    await task.update(payload);
    return task.toJSON();
  }

  /**
   * 删除任务（物理删除）
   * @param {number} id 任务ID
   */
  async destroy(id) {
    const { ctx } = this;
    const task = await ctx.model.Task.findByPk(id);
    if (!task) {
      ctx.throw(404, '任务不存在');
    }

    await task.destroy();
  }

  /**
   * 校验任务必填字段
   * @param {Object} payload 任务数据
   */
  validatePayload(payload) {
    const { ctx } = this;
    ctx.assert(payload.title, 422, '任务名称不能为空');
    ctx.assert(payload.price !== undefined, 422, '任务奖励不能为空');
  }

  /**
   * 获取用户任务统计信息
   * @param {number} userId 用户ID
   * @param {number} userVip 用户VIP等级
   * @return {Object} 统计数据
   */
  async getUserTaskInfo(userId, userVip) {
    const { ctx } = this;
    const dayjs = require('dayjs');

    // 转换真实的主键ID
    const userObj = await ctx.model.User.findOne({ where: { user_id: userId } });
    const dbUserId = userObj ? userObj.id : userId;

    const user = await ctx.model.User.findByPk(dbUserId);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    // VIP 等级对应每日任务上限
    const taskLimitMap = { 1: 30, 2: 60, 3: 90 };
    const num = taskLimitMap[userVip] || (userVip * 30);

    // 已完成的任务数量 (统计所有已完成的订单)
    const overNum = await ctx.model.Order.count({
      where: { user_id: dbUserId, status: { [ctx.app.Sequelize.Op.in]: [ 1, 2, 3 ] } },
    });

    // 今日收益
    const todayOrders = await ctx.model.Order.findAll({
      where: {
        user_id: dbUserId,
        status: { [ctx.app.Sequelize.Op.in]: [ 1, 2, 3 ] },
        pay_time: {
          [ctx.app.Sequelize.Op.gte]: dayjs().startOf('day').toDate(),
          [ctx.app.Sequelize.Op.lte]: dayjs().endOf('day').toDate(),
        },
      },
    });
    let todayIncomeVal = 0;
    todayOrders.forEach(o => {
      todayIncomeVal += Number(o.pay_amount || 0) * Number(o.static_commission || 0);
    });

    // 昨日收益
    const yesterdayOrders = await ctx.model.Order.findAll({
      where: {
        user_id: dbUserId,
        status: { [ctx.app.Sequelize.Op.in]: [ 1, 2, 3 ] },
        pay_time: {
          [ctx.app.Sequelize.Op.gte]: dayjs().subtract(1, 'day').startOf('day')
            .toDate(),
          [ctx.app.Sequelize.Op.lte]: dayjs().subtract(1, 'day').endOf('day')
            .toDate(),
        },
      },
    });
    let yesterdayIncomeVal = 0;
    yesterdayOrders.forEach(o => {
      yesterdayIncomeVal += Number(o.pay_amount || 0) * Number(o.static_commission || 0);
    });

    return {
      freeze_money: Number(user.user_frozen_amount || 0).toFixed(2),
      has_money: Number(user.user_balance || 0).toFixed(2),
      num,
      over_num: overNum || 0,
      revenue_today: Number(todayIncomeVal || 0).toFixed(2),
      revenue_yesterday: Number(yesterdayIncomeVal || 0).toFixed(2),
    };
  }

  async searchTask(userId, userVip) {
    const { ctx } = this;
    const dayjs = require('dayjs');

    // 此时传入的 userId 其实已经是 controller 里转换过的数据库主键 ID 了！
    const user = await ctx.model.User.findByPk(userId, {
      attributes: [ 'id', 'user_balance', 'strategy_id', 'is_task_started' ],
    });
    if (!user) {
      ctx.throw(404, '用户不存在');
    }
    if (!user.is_task_started) {
      ctx.throw(500, '任务未开启，请先绑定策略并开启任务');
    }
    const dbUserId = user.id;

    let overNum = 0;
    // 1. 判断任务状态
    let task_status = 2; // 默认已开启任务

    // 检查是否有未支付的订单
    const unpaidOrder = await ctx.model.Order.findOne({
      where: { user_id: dbUserId, status: 0 },
      include: [{ model: ctx.model.OrderItem, as: 'items' }],
    });

    if (unpaidOrder) {
      task_status = 4; // 任务订单未支付
    } else if (Number(user.user_balance || 0) < 20) {
      task_status = 1; // 用户金额低于20
    } else {
      // 检查今日完成任务数
      const taskLimitMap = { 1: 30, 2: 60, 3: 90 };
      const num = taskLimitMap[userVip] || (userVip * 30);
      const todayStr = dayjs().format('YYYY-MM-DD');

      overNum = await ctx.model.UserTask.count({
        where: { user_id: dbUserId, status: 1, task_date: todayStr },
      });

      if (overNum >= num) {
        task_status = 3; // 用户已完成任务
        ctx.throw(500, '用户任务未开启');
      }
    }

    // 2. 随机抽取一个商品（wares）
    // 在任务商品库里随机取一个商品信息，排除该用户已抽取的商品
    let wares = null;
    if (task_status === 2) {
      const { Sequelize } = ctx.app;
      const { Op } = Sequelize;

      // 获取用户已抽取的任务商品ID
      const drawnTasks = await ctx.model.UserTask.findAll({
        attributes: [ 'task_id' ],
        where: { user_id: dbUserId },
      });
      const drawnTaskIds = drawnTasks.map(t => t.task_id);

      ctx.logger.info(`[DEBUG] searchTask - dbUserId: ${dbUserId}, user_balance: ${user.user_balance}`);

      // 构建查询条件，排除已抽取的任务商品，且商品价格不能大于用户余额
      const whereCondition = {
        status: 1,
        price: { [Op.lte]: Number(user.user_balance || 0) },
      };
      if (drawnTaskIds.length > 0) {
        whereCondition.id = { [Op.notIn]: drawnTaskIds };
      }

      wares = await ctx.model.Task.findOne({
        where: whereCondition,
        order: Sequelize.literal('RAND()'),
      });

      // 如果未抽取到商品（可能所有商品都已抽取过，或剩余商品价格大于用户余额），则重新从所有任务商品中随机抽取（无视已抽取记录）
      if (!wares) {
        const fallbackWhereCondition = {
          status: 1,
          price: { [Op.lte]: Number(user.user_balance || 0) },
        };
        wares = await ctx.model.Task.findOne({
          where: fallbackWhereCondition,
          order: Sequelize.literal('RAND()'),
        });
      }

      // 如果依然没抽到商品（比如根本没有任何商品的价格 <= 用户余额），直接抛出异常
      if (!wares) {
        ctx.throw(500, '暂无匹配的商品可抽取，请稍后再试或联系客服');
      }
    }

    // 3. 构造基础的 order 数据结构（使用模拟数据）
    let order = null;
    let isLucky = false;

    // 去掉模拟延迟，确保数据库操作不受影响
    // const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    // const randomDelay = Math.floor(Math.random() * 500) + 500;
    // await delay(randomDelay);

    if (task_status === 4 && unpaidOrder) {
      // 还原未支付订单的数据
      const item = unpaidOrder.items && unpaidOrder.items.length > 0 ? unpaidOrder.items[0] : null;
      if (item) {
        wares = await ctx.model.Task.findByPk(item.product_id);
      }
      const backRate = Number(unpaidOrder.static_commission || 0);
      order = {
        orderNo: unpaidOrder.order_no,
        orderId: unpaidOrder.order_no,
        policyId: 0,
        policyIdNum: 0,
        price: Number(unpaidOrder.pay_amount || 0),
        backRate,
        backRateView: (backRate * 100).toFixed(2) + '%',
        backMoney: Number(unpaidOrder.pay_amount || 0) * backRate,
        staticBackMoney: Number(unpaidOrder.pay_amount || 0) * backRate,
        trendBackMoney: 0,
        ruleType: 0,
        timeLimit: 10,
        status: 0,
        cTime: unpaidOrder.created_at ? new Date(unpaidOrder.created_at).toISOString() : null,
        uTime: unpaidOrder.updated_at ? new Date(unpaidOrder.updated_at).toISOString() : null,
      };
    }

    if (task_status === 2 && wares) {
      let strategyId = user.strategy_id;
      if (!strategyId) {
        const defaultStrategy = await ctx.model.Strategy.findOne({ where: { type: 0 } });
        strategyId = defaultStrategy ? defaultStrategy.id : 0;
      }

      let backRate = 0.005; // 默认 fallback
      const policyId = strategyId;
      let policyIdNum = 0;
      let ruleType = 0;

      const todayStr = dayjs().format('YYYY-MM-DD');
      const overNum = await ctx.model.UserTask.count({
        where: { user_id: dbUserId, status: 1, task_date: todayStr },
      });
      const currentTaskNum = overNum + 1;

      if (strategyId) {
        const rule = await ctx.model.StrategyRule.findOne({
          where: { strategy_id: strategyId, num: currentTaskNum },
        });

        if (rule) {
          backRate = Number(rule.back_rate || 0);
          policyIdNum = rule.rule_model_id;
          ruleType = rule.rule_type || 0;
        } else {
          const strategy = await ctx.model.Strategy.findByPk(strategyId);
          if (strategy) {
            backRate = Number(strategy.profit_rate || 0);
          }
        }
      }

      const price = Number(wares.price || 0);
      const backMoney = (price * backRate).toFixed(2);

      // 订单预创建逻辑
      // 1. 获取用户默认地址，如果无地址则不创建订单，避免数据库错误
      let addressId = 0;
      const defaultAddress = await ctx.model.LogisticsAddress.findOne({ where: { user_id: dbUserId, is_default: 1 } });
      if (defaultAddress) {
        addressId = defaultAddress.id;
      } else {
        const anyAddress = await ctx.model.LogisticsAddress.findOne({ where: { user_id: dbUserId } });
        addressId = anyAddress ? anyAddress.id : 0;
      }

      let orderCreated = false;
      let finalOrderNo = null;

      // 引入自动重试机制：最多重试 5 次
      for (let i = 0; i < 5; i++) {
        // 订单号在循环内生成，确保重试时使用新号，避免唯一键冲突
        const orderNo = Math.floor(100000000 + Math.random() * 900000000).toString();
        const transaction = await ctx.model.transaction();
        try {
          const createdOrder = await ctx.model.Order.create({
            order_no: orderNo,
            user_id: dbUserId,
            address_id: addressId || 0,
            total_amount: price || 0,
            freight_amount: 0,
            discount_amount: 0,
            pay_amount: price || 0,
            static_commission: backRate || 0,
            dynamic_commission: 0,
            status: 0, // 未支付
            remark: '任务订单',
          }, { transaction });

          await ctx.model.OrderItem.create({
            order_id: createdOrder.id,
            product_id: wares.id,
            product_name: wares.title || '未知商品',
            product_image: wares.img || '',
            price: price || 0,
            quantity: 1,
            total_amount: price || 0,
          }, { transaction });

          await transaction.commit();
          orderCreated = true;
          finalOrderNo = orderNo;
          break; // 写入成功，跳出循环
        } catch (err) {
          await transaction.rollback();
          if (i < 4) {
            // 失败后等待 800ms 再重试
            await new Promise(resolve => setTimeout(resolve, 800));
          } else {
            // 记录最终失败的日志，并抛出带有原始数据库错误信息的异常，用于诊断
            ctx.logger.error(`[searchTask] Order creation failed for user ${dbUserId} after 5 retries:`, err);
            throw new Error(`订单创建失败: ${err.message}`);
          }
        }
      }

      if (orderCreated) {
        order = {
          orderNo: finalOrderNo,
          orderId: finalOrderNo,
          policyId,
          policyIdNum,
          price,
          backRate,
          backRateView: (backRate * 100).toFixed(2) + '%',
          backMoney: Number(backMoney),
          staticBackMoney: Number(backMoney),
          trendBackMoney: 0,
          ruleType,
          timeLimit: 10,
          status: 0,
          cTime: new Date().toISOString(),
          uTime: new Date().toISOString(),
        };
        isLucky = order.ruleType === 1;
      }
    }

    return {
      task_status,
      overNum,
      wares: wares ? wares.toJSON() : {},
      order: order || {},
      isLucky,
    };
  }
}

module.exports = TaskService;
