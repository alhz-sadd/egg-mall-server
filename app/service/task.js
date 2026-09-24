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

    // 从统计表获取今日收益
    const todayStr = dayjs().format('YYYY-MM-DD');
    const todayStat = await ctx.model.UserTaskStat.findOne({
      where: {
        user_id: dbUserId,
        stat_date: todayStr,
      },
    });
    const todayIncomeVal = todayStat ? Number(todayStat.task_income || 0) : 0;

    // 从统计表获取昨日收益
    const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const yesterdayStat = await ctx.model.UserTaskStat.findOne({
      where: {
        user_id: dbUserId,
        stat_date: yesterdayStr,
      },
    });
    const yesterdayIncomeVal = yesterdayStat ? Number(yesterdayStat.task_income || 0) : 0;

    // 从进度表计算已完成订单数 (修改: 仅统计当前活动任务模板下的订单，而不是该用户历史所有订单)
    // 获取最新的一条绑定的任务记录（包含已绑定但未开启、或者已开启的）
    const currentTaskUser = await ctx.model.ShopTaskUser.findOne({
      where: { user_id: dbUserId, status: { [ctx.app.Sequelize.Op.in]: [0, 1] } }, // 0: 已绑定, 1: 任务进行中
      order: [['id', 'DESC']]
    });

    let overNum = 0;
    let isOpen = 0; // 是否已开启任务 0=未开启 1=已开启
    let sumNum = 0;

    if (currentTaskUser) {
      if (currentTaskUser.status === 1) {
        isOpen = 1;
      }
      
      // 仅统计当前活动任务下的已完成订单数
      overNum = await ctx.model.ShopTaskUserItemProgress.count({
        where: {
          shop_task_user_id: currentTaskUser.id,
          user_id: dbUserId,
          status: 1 // 已完成
        }
      });
      
      const task = await ctx.model.ShopTask.findByPk(currentTaskUser.task_id);
      if (task) {
        sumNum = Number(task.task_count || 0);
      }
    }

    return {
      freeze_voucher_balance: userWallet ? Number(userWallet.freeze_voucher_balance || 0).toFixed(2) : '0.00', // 冻结金额
      has_money: userWallet ? Number(userWallet.balance).toFixed(2) : '0.00',
      num: sumNum, // 当前任务总数量
      over_num: overNum || 0,
      revenue_today: todayIncomeVal.toFixed(2), // 今日收益
      revenue_yesterday: yesterdayIncomeVal.toFixed(2), // 昨日收益
      is_open: isOpen, // 是否已开启任务 0未开启，1已开启
    };
  }

  async search(userId) {
    const { ctx } = this;
    const { Sequelize } = ctx.app;
    const { Op } = Sequelize;

    // 1. 获取用户信息和余额
    const user = await ctx.model.SysUser.findByPk(userId);
    if (!user || user.user_type !== 4) {
      // 不抛错，而是返回特定的未找到状态，交由上层统一包装 200 HTTP 响应
      const err = new Error('用户不存在');
      err.status = 404;
      throw err;
    }
    
    const userWallet = await ctx.model.UserWallet.findOne({ where: { user_id: userId } });
    const userBalance = userWallet ? Number(userWallet.balance || 0) : 0;
    
    // 任务门槛和商品匹配，都使用总余额 balance
    const totalBalance = userBalance;

    // 2. 检查是否有开启的任务
    const shopTaskUser = await ctx.model.ShopTaskUser.findOne({
      where: {
        user_id: userId,
        status: 1 // 1: 任务进行中 (B端已开启)
      },
      order: [['id', 'DESC']]
    });

    if (!shopTaskUser) {
      // 检查是否有未开启(已绑定)的任务
      const boundTask = await ctx.model.ShopTaskUser.findOne({
        where: { user_id: userId, status: 0 },
        order: [['id', 'DESC']]
      });
      if (boundTask) {
        return { sequence_no: 0, task_status: 0, wares: {}, order: {}, is_lucky: 0 };
      }

      // 检查是否有已完成的任务
      const completedTask = await ctx.model.ShopTaskUser.findOne({
        where: { user_id: userId, status: 2 },
        order: [['id', 'DESC']]
      });
      if (completedTask) {
        return { sequence_no: 0, task_status: 3, wares: {}, order: {}, is_lucky: 0 };
      }
      
      // 没有任何绑定的任务时
      const err = new Error('任务不存在或已禁用');
      err.status = 404;
      throw err;
    }

    const shopTask = await ctx.model.ShopTask.findByPk(shopTaskUser.task_id);
    if (!shopTask || shopTask.status !== 1) {
      const err = new Error('任务不存在或已禁用');
      err.status = 404;
      throw err;
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
      const yieldRate = unpaidProgress.yield_rate !== null && Number(unpaidProgress.yield_rate) > 0 ? Number(unpaidProgress.yield_rate) : (taskItem && taskItem.yield_rate !== null ? Number(taskItem.yield_rate) : Number(shopTask.yield_rate));
      const parentYieldRate = Number(shopTask.parent_yield_rate);
      const revenue = unpaidProgress.revenue !== null ? Number(unpaidProgress.revenue) : (orderAmount * yieldRate);
      
      let picUrl = '';
      if (unpaidProgress.goods_id) {
        const unpaidGoods = await ctx.model.Goods.findOne({ where: { goods_id: unpaidProgress.goods_id } });
        if (unpaidGoods) {
          if (unpaidGoods.images && Array.isArray(unpaidGoods.images) && unpaidGoods.images.length > 0) {
            picUrl = unpaidGoods.images[0];
          } else if (unpaidGoods.cover_image) {
            picUrl = unpaidGoods.cover_image;
          }
        }
      }

      const wares = {
        goods_id: unpaidProgress.goods_id,
        wares_name: unpaidProgress.goods_title,
        total_price: orderAmount,
        pic_url: picUrl
      };
      
      const order = {
        order_id: unpaidProgress.order_id,
        total_price: orderAmount,
        revenue_rate: yieldRate,           // 收益率
        return_money: revenue,             // 回报金额 (静态收益)
        parent_revenue_rate: parentYieldRate,
        parent_revenue: revenue * parentYieldRate, // 动态收益 = 静态收益 * 上级收益率
        order_type: taskItem ? (taskItem.is_lucky_order === 1 ? 2 : 1) : 1, // 1:普通订单, 2:幸运订单
        c_time: unpaidProgress.create_time
      };

      return {
        sequence_no: taskItem ? taskItem.sort : 0,
        task_status: 4,
        wares,
        order,
        is_lucky: taskItem ? taskItem.is_lucky_order : 0
      };
    }

    // 4. 检查余额是否满足最小金额 (使用总余额 balance)
    if (totalBalance < Number(shopTask.min_amount)) {
      return { sequence_no: 0, task_status: 1, wares: {}, order: {}, is_lucky: 0 };
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
      await shopTaskUser.update({ status: 2 });
      return { sequence_no: 0, task_status: 3, wares: {}, order: {}, is_lucky: 0 };
    }

    const currentItem = await ctx.model.ShopTaskItem.findOne({ where: { item_id: nextProgress.task_item_id } });
    if (!currentItem) {
      ctx.throw(500, '任务子项配置丢失');
    }

    // 6. 选取商品
    const isLuckyOrder = nextProgress.is_lucky_order !== null ? nextProgress.is_lucky_order : currentItem.is_lucky_order;
    const appendAmount = nextProgress.append_amount !== null ? Number(nextProgress.append_amount) : Number(currentItem.append_amount);
    const ruleType = nextProgress.rule_type !== null ? nextProgress.rule_type : currentItem.rule_type;
    const yieldRate = nextProgress.yield_rate !== null && Number(nextProgress.yield_rate) > 0 ? Number(nextProgress.yield_rate) : Number(shopTask.yield_rate);

    let waresModel = null;
    let goodsPrice = 0;

    if (ruleType === 2) {
      // 手动匹配
      const goodsId = nextProgress.goods_id || currentItem.goods_id;
      if (goodsId) {
        waresModel = await ctx.model.Goods.findOne({ where: { goods_id: goodsId, is_deleted: 0 } });
      }
      
      if (!waresModel) {
        // 如果找不到商品，但手动匹配配置了价格和名称，也可以直接用
        const title = nextProgress.goods_title || currentItem.goods_title || '未知商品';
        const price = nextProgress.goods_price !== null ? Number(nextProgress.goods_price) : Number(currentItem.goods_price);
        waresModel = {
          goods_id: goodsId || 0,
          goods_name: title,
          price: price,
          cover_image: ''
        };
      }
      goodsPrice = Number(waresModel.price);
    } else {
      // 智能匹配
      let targetGoodsPriceMax = totalBalance;
      if (isLuckyOrder === 1) {
        targetGoodsPriceMax = totalBalance + appendAmount;
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

      waresModel = await ctx.model.Goods.findOne({
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

      goodsPrice = Number(waresModel.price);
      if (isLuckyOrder === 1) {
        goodsPrice = targetGoodsPriceMax;
      }
    }

    // 7. 更新进度（生成订单）
    const orderNo = 'T' + Date.now() + Math.floor(Math.random() * 1000);
    const cTime = new Date();
    
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

    let picUrl = '';
    if (waresModel) {
      if (waresModel.images && Array.isArray(waresModel.images) && waresModel.images.length > 0) {
        picUrl = waresModel.images[0];
      } else if (waresModel.cover_image) {
        picUrl = waresModel.cover_image;
      }
    }

    const wares = {
      goods_id: waresModel.goods_id,
      wares_name: waresModel.goods_name,
      total_price: goodsPrice,
      pic_url: picUrl
    };

    const order = {
      order_id: orderNo,
      total_price: goodsPrice,
      revenue_rate: yieldRate,           // 收益率
      return_money: revenue,             // 回报金额(即静态收益)
      parent_revenue_rate: parentYieldRate,
      parent_revenue: revenue * parentYieldRate, // 动态收益 = 静态收益 * 上级收益率
      order_type: isLuckyOrder === 1 ? 2 : 1, // 1:普通订单, 2:幸运订单
      c_time: cTime
    };

    return {
      sequence_no: currentItem.sort,
      task_status: 2,
      wares,
      order,
      is_lucky: isLuckyOrder
    };
  }
}

module.exports = TaskService;
