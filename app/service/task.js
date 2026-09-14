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
    const task = await ctx.model.ShopTask.findByPk(id, {
      include: [
        {
          model: ctx.model.ShopTaskItem,
          as: 'items'
        }
      ]
    });
    if (!task) {
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

    // userId 已经是 SysUser 的主键 ID
    const dbUserId = userId;

    const userWallet = await ctx.model.UserWallet.findOne({ where: { user_id: dbUserId } });

    // 从进度表计算今日收益
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();

    const todayProgress = await ctx.model.ShopTaskUserItemProgress.findAll({
      where: {
        user_id: dbUserId,
        status: 1, // 已完成
        update_time: {
          [ctx.app.Sequelize.Op.between]: [todayStart, todayEnd]
        }
      }
    });

    let todayIncomeVal = 0;
    for (const p of todayProgress) {
      todayIncomeVal += Number(p.revenue || 0);
    }

    // 从进度表计算昨日收益
    const yesterdayStart = dayjs().subtract(1, 'day').startOf('day').toDate();
    const yesterdayEnd = dayjs().subtract(1, 'day').endOf('day').toDate();

    const yesterdayProgress = await ctx.model.ShopTaskUserItemProgress.findAll({
      where: {
        user_id: dbUserId,
        status: 1,
        update_time: {
          [ctx.app.Sequelize.Op.between]: [yesterdayStart, yesterdayEnd]
        }
      }
    });

    let yesterdayIncomeVal = 0;
    for (const p of yesterdayProgress) {
      yesterdayIncomeVal += Number(p.revenue || 0);
    }

    // 从进度表计算已完成订单数
    const overNum = await ctx.model.ShopTaskUserItemProgress.count({
      where: {
        user_id: dbUserId,
        status: 1 // 已完成
      }
    });

    // 计算总任务数(基于正在进行的 shop_task_user)
    let sumNum = 0;
    const currentTaskUser = await ctx.model.ShopTaskUser.findOne({
      where: { user_id: dbUserId, task_status: { [ctx.app.Sequelize.Op.in]: [0, 1] } } // 0=未完成, 1=进行中
    });

    if (currentTaskUser) {
      const task = await ctx.model.ShopTask.findByPk(currentTaskUser.task_id);
      if (task) {
        sumNum = Number(task.task_count || 0);
      }
    }

    return {
      freeze_money: '0.00', // 新表没有直接的冻结金额
      has_money: userWallet ? Number(userWallet.balance).toFixed(2) : '0.00',
      num: sumNum, // 当前任务总数量
      over_num: overNum || 0,
      revenue_today: todayIncomeVal.toFixed(2), // 今日收益
      revenue_yesterday: yesterdayIncomeVal.toFixed(2), // 昨日收益
    };
  }

  async search(userId) {
    const { ctx } = this;
    const { Sequelize } = ctx.app;
    const { Op } = Sequelize;

    // 1. 获取用户信息和余额
    const user = await ctx.model.SysUser.findByPk(userId);
    if (!user || user.user_type !== 4) {
      ctx.throw(404, '用户不存在');
    }
    
    const userWallet = await ctx.model.UserWallet.findOne({ where: { user_id: userId } });
    const userBalance = userWallet ? Number(userWallet.balance) : 0;

    // 2. 检查是否有开启的任务
    const shopTaskUser = await ctx.model.ShopTaskUser.findOne({
      where: {
        user_id: userId,
        task_status: 1 // 1: 任务进行中 (B端已开启)
      },
      order: [['id', 'DESC']]
    });

    if (!shopTaskUser) {
      // 检查是否有未开启(已绑定)的任务
      const boundTask = await ctx.model.ShopTaskUser.findOne({
        where: { user_id: userId, task_status: 0 }
      });
      if (boundTask) {
        return { '序列号': 0, sequence_no: 0, task_status: 0, wares: {}, order: {}, is_lucky: 0 };
      }

      // 检查是否有已完成的任务
      const completedTask = await ctx.model.ShopTaskUser.findOne({
        where: { user_id: userId, task_status: 2 }
      });
      if (completedTask) {
        return { '序列号': 0, sequence_no: 0, task_status: 3, wares: {}, order: {}, is_lucky: 0 };
      }
      return { '序列号': 0, sequence_no: 0, task_status: 0, wares: {}, order: {}, is_lucky: 0 };
    }

    const shopTask = await ctx.model.ShopTask.findByPk(shopTaskUser.task_id);
    if (!shopTask) {
      return { '序列号': 0, sequence_no: 0, task_status: 0, wares: {}, order: {}, is_lucky: 0 };
    }

    // 3. 检查是否有未支付订单 (is_processing = 1, status = 0)
    const unpaidProgress = await ctx.model.ShopTaskUserItemProgress.findOne({
      where: {
        shop_task_user_id: shopTaskUser.id,
        user_id: userId,
        status: 0,
        is_processing: 1
      }
    });

    if (unpaidProgress && unpaidProgress.order_id) {
      const taskItem = await ctx.model.ShopTaskItem.findOne({ where: { item_id: unpaidProgress.task_item_id } });
      const orderAmount = Number(unpaidProgress.goods_price);
      const yieldRate = Number(shopTask.yield_rate);
      const parentYieldRate = Number(shopTask.parent_yield_rate);
      
      const wares = {
        goods_id: unpaidProgress.goods_id,
        goods_title: unpaidProgress.goods_title,
        price: orderAmount
      };
      
      const order = {
        orderNo: unpaidProgress.order_id,
        price: orderAmount,
        backRate: yieldRate,
        parentBackRate: parentYieldRate,
        staticBackMoney: orderAmount * yieldRate,
        dynamicBackMoney: orderAmount * parentYieldRate,
        ruleType: taskItem ? taskItem.rule_type : 0,
        cTime: unpaidProgress.create_time
      };

      return {
        '序列号': taskItem ? taskItem.sort : 0,
        sequence_no: taskItem ? taskItem.sort : 0,
        task_status: 4,
        wares,
        order,
        is_lucky: taskItem ? taskItem.is_lucky_order : 0
      };
    }

    // 4. 检查余额是否满足最小金额
    if (userBalance < Number(shopTask.min_amount)) {
      return { '序列号': 0, sequence_no: 0, task_status: 1, wares: {}, order: {}, is_lucky: 0 };
    }

    // 5. 获取当前要进行的任务子项 (status = 0, is_processing = 0)
    const nextProgress = await ctx.model.ShopTaskUserItemProgress.findOne({
      where: {
        shop_task_user_id: shopTaskUser.id,
        user_id: userId,
        status: 0,
        is_processing: 0
      },
      order: [['id', 'ASC']]
    });

    if (!nextProgress) {
      // 没有未开始的子项了，说明全部完成
      await shopTaskUser.update({ task_status: 2 });
      return { '序列号': 0, sequence_no: 0, task_status: 3, wares: {}, order: {}, is_lucky: 0 };
    }

    const currentItem = await ctx.model.ShopTaskItem.findOne({ where: { item_id: nextProgress.task_item_id } });
    if (!currentItem) {
      ctx.throw(500, '任务子项配置丢失');
    }

    // 6. 选取商品
    let targetGoodsPriceMax = userBalance;
    if (currentItem.is_lucky_order === 1) {
      targetGoodsPriceMax = userBalance + Number(currentItem.append_amount);
    }

    const usedProgresses = await ctx.model.ShopTaskUserItemProgress.findAll({
      where: {
        shop_task_user_id: shopTaskUser.id,
        user_id: userId,
        goods_id: { [Op.not]: null }
      },
      attributes: ['goods_id']
    });
    const usedGoodsIds = usedProgresses.map(p => p.goods_id);

    let goodsWhere = {
      status: 1,
      is_deleted: 0,
      price: { [Op.lte]: targetGoodsPriceMax }
    };

    if (usedGoodsIds.length > 0) {
      goodsWhere.goods_id = { [Op.notIn]: usedGoodsIds };
    }

    let waresModel = await ctx.model.Goods.findOne({
      where: goodsWhere,
      order: Sequelize.literal('RAND()')
    });

    if (!waresModel && usedGoodsIds.length > 0) {
      delete goodsWhere.goods_id;
      waresModel = await ctx.model.Goods.findOne({
        where: goodsWhere,
        order: Sequelize.literal('RAND()')
      });
    }

    if (!waresModel) {
      ctx.throw(500, '暂无匹配的商品可接取，请稍后再试');
    }

    let goodsPrice = Number(waresModel.price);
    if (currentItem.is_lucky_order === 1) {
      goodsPrice = targetGoodsPriceMax;
    }

    // 7. 更新进度（生成订单）
    const orderNo = 'T' + Date.now() + Math.floor(Math.random() * 1000);
    const cTime = new Date();
    
    const yieldRate = Number(shopTask.yield_rate);
    const parentYieldRate = Number(shopTask.parent_yield_rate);
    const revenue = goodsPrice * yieldRate;

    await nextProgress.update({
      order_id: orderNo,
      goods_id: waresModel.goods_id,
      goods_price: goodsPrice,
      goods_title: waresModel.goods_name,
      revenue: revenue,
      is_processing: 1,
      is_triggered: 1,
      update_time: cTime
    });

    const wares = {
      goods_id: waresModel.goods_id,
      goods_title: waresModel.goods_name,
      price: goodsPrice,
      cover_image: waresModel.cover_image
    };

    const order = {
      orderNo: orderNo,
      price: goodsPrice,
      backRate: yieldRate,
      parentBackRate: parentYieldRate,
      staticBackMoney: revenue,
      dynamicBackMoney: goodsPrice * parentYieldRate,
      ruleType: currentItem.rule_type || 0,
      cTime: cTime
    };

    return {
      '序列号': currentItem.sort,
      sequence_no: currentItem.sort,
      task_status: 2,
      wares,
      order,
      is_lucky: currentItem.is_lucky_order
    };
  }
}

module.exports = TaskService;
