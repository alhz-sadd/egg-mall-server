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
      where.task_name = { [Op.like]: `%${keyword}%` };
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.ShopTask.findAndCountAll({
      where,
      order: [[ 'sort', 'DESC' ], [ 'task_id', 'DESC' ]],
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
    const { keyword, status, yield_rate_min, yield_rate_max, page = 1, page_size = 10 } = query;

    const where = {};
    if (keyword) {
      where.task_name = { [Op.like]: `%${keyword}%` };
    }
    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }
    if (yield_rate_min !== undefined || yield_rate_max !== undefined) {
      where.yield_rate = {};
      if (yield_rate_min !== undefined) {
        where.yield_rate[Op.gte] = Number(yield_rate_min);
      }
      if (yield_rate_max !== undefined) {
        where.yield_rate[Op.lte] = Number(yield_rate_max);
      }
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.ShopTask.findAndCountAll({
      where,
      order: [[ 'sort', 'DESC' ], [ 'task_id', 'DESC' ]],
      offset,
      limit,
    });

    const list = rows.map(item => {
      const json = item.toJSON ? item.toJSON() : item;
      return {
        ...json,
        productName: json.task_name,
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
          as: 'items',
        },
      ],
    });
    if (!task) {
      ctx.throw(404, ctx.__('task.task_not_exist_disabled'));
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

    const task = await ctx.model.ShopTask.create(payload);
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
    const task = await ctx.model.ShopTask.findByPk(id);
    if (!task) {
      ctx.throw(404, ctx.__('task.task_not_exist'));
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
    const task = await ctx.model.ShopTask.findByPk(id);
    if (!task) {
      ctx.throw(404, ctx.__('task.task_not_exist'));
    }

    await task.destroy();
  }

  /**
   * 校验任务必填字段
   * @param {Object} payload 任务数据
   */
  validatePayload(payload) {
    const { ctx } = this;
    ctx.assert(payload.task_name, 422, ctx.__('task.task_name_empty'));
    ctx.assert(payload.yield_rate !== undefined, 422, ctx.__('task.task_reward_empty'));
  }

  /**
   * 获取用户任务统计信息
   * @param {number} userId 用户ID
   * @return {Object} 统计数据
   */
  async getUserTaskInfo(userId) {
    const { ctx } = this;
    const dayjs = require('dayjs');

    // userId 已经是 SysUser 的主键 ID
    const dbUserId = userId;

    const todayStr = dayjs().format('YYYY-MM-DD');
    const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    // 【终极修复】：彻底废弃任务大厅的 Redis 缓存，强制每次都走 DB，解决用户刚做完任务后 1-2 秒内回到首页数据不刷新的偶发问题。
    // 因为 search 抢单接口已经有防连点锁了，任务大厅详情页这点并发对于 MySQL 来说完全能抗住。
    const cacheKey = `user_task_info_v2:${dbUserId}`;
    /* 彻底移除缓存读取
    if (ctx.app.redis) {
      try {
        const cachedData = await ctx.app.redis.get(cacheKey);
        if (cachedData) {
          try {
            // 埋点：记录成功从 Redis 获取任务首页数据
            ctx.logger.info(`[任务首页埋点] 用户 ${dbUserId} 成功从 Redis 缓存获取任务首页数据`);
            return JSON.parse(cachedData);
          } catch (e) {
            ctx.logger.error(`[TaskCacheError] 用户 ${dbUserId} 缓存解析失败`, e);
            await ctx.app.redis.del(cacheKey);
          }
        }
      } catch (err) {
        ctx.logger.warn(`[TaskService.getUserTaskInfo] Redis 获取缓存失败: ${err.message}`);
      }
    }
    */

    // 考虑到用户可能有多轮任务，且任务记录的更新可能会非常快，
    // 我们改用从 ShopTaskUserItemProgress 表中按时间范围直接统计，防止 UserTaskStat 表同步延迟
    // 优化：修复 Node.js 服务器时区与数据库/用户所在时区可能不一致导致的任务时间边界判断错误
    // 强制使用服务器所在时区（如北京时间 +08:00，与生产环境配置 timezone 保持一致）
    // 或者基于 ctx.request 的时区进行动态换算（这里我们先采用基于当前进程所在时区做严格日期切割）
    const now = new Date();
    // 构建严格的“今天”的起始和结束时间
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);

    // 1. 串行查询避免并发高并发时打爆连接池 (修复 ECONNRESET)
    // 之前用 Promise.all 瞬间占满 4 个连接，如果有并发请求直接导致连接池枯竭
    const userWallet = await ctx.model.UserWallet.findOne({ where: { user_id: dbUserId } });
    const todayIncomeResult = await ctx.model.ShopTaskUserItemProgress.sum('revenue', {
      where: {
        user_id: dbUserId,
        status: { [ctx.app.Sequelize.Op.in]: [ 1, 2 ] }, // 只要完成了(或异常)就算收益
        update_time: {
          [ctx.app.Sequelize.Op.between]: [ todayStart, todayEnd ],
        },
      },
    });
    const yesterdayIncomeResult = await ctx.model.ShopTaskUserItemProgress.sum('revenue', {
      where: {
        user_id: dbUserId,
        status: { [ctx.app.Sequelize.Op.in]: [ 1, 2 ] },
        update_time: {
          [ctx.app.Sequelize.Op.between]: [ yesterdayStart, yesterdayEnd ],
        },
      },
    });
    const currentTaskUser = await ctx.model.ShopTaskUser.findOne({
      where: { user_id: dbUserId, status: { [ctx.app.Sequelize.Op.in]: [ 0, 1 ] } }, // 0: 已绑定, 1: 任务进行中
      order: [[ 'id', 'DESC' ]],
    });

    const todayIncomeVal = todayIncomeResult ? Number(todayIncomeResult) : 0;
    const yesterdayIncomeVal = yesterdayIncomeResult ? Number(yesterdayIncomeResult) : 0;

    let overNum = 0;
    let isOpen = 0; // 是否已开启任务 0=未开启 1=已开启
    let sumNum = 0;

    if (currentTaskUser) {
      if (currentTaskUser.status === 1) {
        isOpen = 1;
      }

      // 2. 将后续依赖 currentTaskUser 的查询也改为串行执行
      const overNumResult = await ctx.model.ShopTaskUserItemProgress.count({
        where: {
          shop_task_user_id: currentTaskUser.id,
          user_id: dbUserId,
          status: { [ctx.app.Sequelize.Op.in]: [ 1, 2 ] }, // 1:已完成 2:异常
        },
      });
      const taskResult = await ctx.model.ShopTask.findByPk(currentTaskUser.task_id);

      overNum = overNumResult;

      if (taskResult) {
        sumNum = Number(taskResult.task_count || 0);
      }
    }

    let hasMoney = '0.00';
    if (userWallet) {
      const balance = Number(userWallet.balance || 0);
      hasMoney = isNaN(balance) ? '0.00' : balance.toFixed(2);
    }

    const result = {
      freeze_voucher_balance: userWallet ? Number(userWallet.freeze_voucher_balance || 0).toFixed(2) : '0.00', // 冻结金额
      has_money: hasMoney,
      num: sumNum, // 当前任务总数量
      over_num: overNum || 0,
      revenue_today: todayIncomeVal.toFixed(2), // 今日收益
      revenue_yesterday: yesterdayIncomeVal.toFixed(2), // 昨日收益
      is_open: isOpen, // 是否已开启任务 0未开启，1已开启
    };

    // 在返回前对 result 做一次深度的 BigInt 清洗，确保 Controller 层直接 body 返回时不会炸
    const safeResult = JSON.parse(JSON.stringify(result, (key, value) =>
      (typeof value === 'bigint' ? value.toString() : value),
    ));

    // 埋点：记录成功从数据库查到任务首页数据
    ctx.logger.info(`[任务首页埋点] 用户 ${dbUserId} 成功从 MySQL 数据库获取任务首页数据, 余额: ${safeResult.has_money}, 任务状态: ${safeResult.is_open}`);

    /* 彻底移除缓存写入
    if (ctx.app.redis) {
      try {
        await ctx.app.redis.set(cacheKey, JSON.stringify(safeResult), 'EX', 1);
      } catch (err) {
        ctx.logger.warn(`[TaskService.getUserTaskInfo] Redis 设置缓存失败: ${err.message}`);
      }
    }
    */

    return safeResult;
  }

  async search(userId) {
    const { ctx } = this;
    const { Sequelize } = ctx.app;
    const { Op } = Sequelize;

    // --- 核心优化：将 Redis 防连点分布式锁提前到函数最顶部 ---
    // 防止用户或脚本并发连点瞬间打爆数据库连接池 (解决 90 次连点引发 400+ 查询导致的卡顿问题)
    const searchLockKey = `search_task_lock:${userId}`;
    if (ctx.app.redis) {
      const acquired = await ctx.app.redis.set(searchLockKey, 'locked', 'EX', 3, 'NX');
      if (!acquired) {
        ctx.logger.warn(`[任务埋点] 用户 ${userId} 搜索任务被拦截，原因：触发了 Redis 分布式防连点锁`);
        // 使用 ctx.body 直接返回前端可识别的状态，避免抛出 Error 导致大量后台日志
        // 这里可以直接返回 { code: 429, message: ... } 或前端能接受的任务状态结构
        // 因为这是一个频繁发生的正常拦截行为，不需要记录到 ERROR 级别日志里
        ctx.status = 200;
        ctx.body = {
          code: 429,
          message: ctx.__('task.task_is_generating') || '任务生成中，请勿重复点击',
          data: { sequence_no: 0, task_status: 1, wares: {}, order: {}, is_lucky: 0 }, // 根据前端所需格式返回，或仅返回提示
        };
        // 中断执行，但不是抛异常
        return ctx.body.data;
      }
    }

    try {
      // 1. 获取用户信息和余额
      const user = await ctx.model.SysUser.findByPk(userId);
      // 允许业务员(3)和店长(2)也能在移动端登录查看测试
      if (!user || ![ 2, 3, 4 ].includes(Number(user.user_type))) {
        // 埋点：记录为什么该用户搜索任务返回 -1
        ctx.logger.warn(`[任务埋点] 用户 ${userId} 搜索任务被拦截，原因：用户不存在或角色不符，当前角色：${user ? user.user_type : 'null'}`);
        if (ctx.app.redis) await ctx.app.redis.del(searchLockKey); // 释放锁
        // 账号不存在或者角色不符时，返回 -1 状态避免产生 400 错误日志
        return { task_status: -1 };
      }

      const userWallet = await ctx.model.UserWallet.findOne({ where: { user_id: userId } });

      // 任务门槛和商品匹配，使用用户所有非冻结资产
      // balance 已经是用户的总可用余额，直接使用 balance 即可，无需再加收益统计字段
      const userBalance = userWallet ? Number(userWallet.balance || 0) : 0;
      const totalBalance = userBalance;

      // 2. 检查是否有开启的任务
      const shopTaskUser = await ctx.model.ShopTaskUser.findOne({
        where: {
          user_id: userId,
          status: 1, // 1: 任务进行中 (B端已开启)
        },
        order: [[ 'id', 'DESC' ]],
      });

      if (!shopTaskUser) {
        // 检查是否有未开启(已绑定)的任务
        const boundTask = await ctx.model.ShopTaskUser.findOne({
          where: { user_id: userId, status: 0 },
          order: [[ 'id', 'DESC' ]],
        });

        // 注意：这里需要区分，如果 status 是 0 但 task_status 是 2，说明他刚做完了一轮，
        // 对于接任务界面，可以返回 3(代表已完成/待重新开启)，如果仅仅是 0，那就是还没做过
        if (boundTask) {
          if (boundTask.task_status === 2 || boundTask.task_status === 1) {
            // 修复历史脏数据：如果 status=0 且 task_status=1，说明是之前 search() 漏改了 task_status 的脏数据
            if (boundTask.task_status === 1) {
              await boundTask.update({ task_status: 2 });
            }
            ctx.logger.warn(`[任务埋点] 用户 ${userId} 搜索任务被拦截，原因：上一轮任务已完成(task_status=2)待重新开启`);
            if (ctx.app.redis) await ctx.app.redis.del(searchLockKey); // 释放锁
            return { sequence_no: 0, task_status: 3, wares: {}, order: {}, is_lucky: 0 };
          }
          if (ctx.app.redis) await ctx.app.redis.del(searchLockKey); // 释放锁
          return { sequence_no: 0, task_status: 0, wares: {}, order: {}, is_lucky: 0 };
        }

        // 检查是否有已完成的任务
        const completedTask = await ctx.model.ShopTaskUser.findOne({
          where: { user_id: userId, status: 2 },
          order: [[ 'id', 'DESC' ]],
        });
        if (completedTask) {
          ctx.logger.warn(`[任务埋点] 用户 ${userId} 搜索任务被拦截，原因：所有任务已结束(status=2)`);
          if (ctx.app.redis) await ctx.app.redis.del(searchLockKey); // 释放锁
          return { sequence_no: 0, task_status: 3, wares: {}, order: {}, is_lucky: 0 };
        }

        // 没有任何绑定的任务时，统一返回未开启提示，返回 -1 避免抛出 400 Error 刷屏日志
        ctx.logger.warn(`[任务埋点] 用户 ${userId} 搜索任务被拦截，原因：该用户没有任何绑定的任务记录`);
        if (ctx.app.redis) await ctx.app.redis.del(searchLockKey); // 释放锁
        return { task_status: -1 };
      }

      const shopTask = await ctx.model.ShopTask.findByPk(shopTaskUser.task_id);
      if (!shopTask || shopTask.status !== 1) {
        // 任务被禁用或不存在，同样返回空状态
        ctx.logger.warn(`[任务埋点] 用户 ${userId} 搜索任务被拦截，原因：绑定的主任务 ${shopTaskUser.task_id} 不存在或未开启(status!=1)`);
        if (ctx.app.redis) await ctx.app.redis.del(searchLockKey); // 释放锁
        return { task_status: -1 };
      }

      // 4. 检查余额是否满足最小金额 (使用总余额 balance)
      // 注意：我们将这段逻辑前置到了生成订单之前，这样如果没有达到门槛金额，
      // 前端就能正确得到 { task_status: 1 } (余额不足状态) 而不会去走搜索逻辑
      if (totalBalance < Number(shopTask.min_amount)) {
        ctx.logger.warn(`[任务埋点] 用户 ${userId} 搜索任务被拦截，原因：余额不足。当前余额：${totalBalance}，任务门槛：${shopTask.min_amount}`);
        if (ctx.app.redis) await ctx.app.redis.del(searchLockKey); // 释放锁
        return { sequence_no: 0, task_status: 1, wares: {}, order: {}, is_lucky: 0 };
      }

      // 3. 检查是否有未支付订单 (is_processing = 1, status = 0)
      const unpaidProgress = await ctx.model.ShopTaskUserItemProgress.findOne({
        where: {
          shop_task_user_id: shopTaskUser.id,
          user_id: userId,
          status: 0,
          is_processing: 1,
        },
      });

      if (unpaidProgress && unpaidProgress.order_id) {
        const taskItem = await ctx.model.ShopTaskItem.findOne({ where: { item_id: unpaidProgress.task_item_id } });
        const orderAmount = Number(unpaidProgress.goods_price);

        let yieldRate = 0;
        if (unpaidProgress.yield_rate !== null && Number(unpaidProgress.yield_rate) > 0) {
          yieldRate = Number(unpaidProgress.yield_rate);
        } else if (taskItem && taskItem.yield_rate !== null) {
          yieldRate = Number(taskItem.yield_rate);
        } else if (shopTask && shopTask.yield_rate !== null) {
          yieldRate = Number(shopTask.yield_rate);
        }

        const parentYieldRate = shopTask ? Number(shopTask.parent_yield_rate || 0) : 0;
        const revenue = unpaidProgress.revenue !== null ? Number(unpaidProgress.revenue) : (orderAmount * yieldRate);

        let picUrl = '';
        if (unpaidProgress.goods_id) {
          const unpaidGoods = await ctx.model.GoodsTask.findOne({ where: { id: unpaidProgress.goods_id } });
          if (unpaidGoods) {
            if (unpaidGoods.goods_images && Array.isArray(unpaidGoods.goods_images) && unpaidGoods.goods_images.length > 0) {
              picUrl = unpaidGoods.goods_images[0];
            }
          }
        }

        const wares = {
          goods_id: unpaidProgress.goods_id,
          wares_name: unpaidProgress.goods_title,
          total_price: orderAmount,
          pic_url: picUrl,
        };

        const order = {
          order_id: unpaidProgress.order_id,
          total_price: orderAmount,
          revenue_rate: yieldRate, // 收益率
          return_money: revenue, // 回报金额 (静态收益)
          parent_revenue_rate: parentYieldRate,
          parent_revenue: revenue * parentYieldRate, // 动态收益 = 静态收益 * 上级收益率
          order_type: taskItem ? (taskItem.is_lucky_order === 1 ? 2 : 1) : 1, // 1:普通订单, 2:幸运订单
          c_time: unpaidProgress.create_time,
        };

        // 如果用户只是重新请求未支付订单，可以安全释放锁
        if (ctx.app.redis) await ctx.app.redis.del(searchLockKey);
        return {
          sequence_no: taskItem ? taskItem.sort : 0,
          task_status: 4,
          wares,
          order,
          is_lucky: taskItem ? taskItem.is_lucky_order : 0,
        };
      }

      // (原 4. 检查余额逻辑已移动到 3. 上方)

      // 5. 获取当前要进行的任务子项 (status = 0, is_processing = 0)
      // 优化：开启事务锁，防止在极端并发下（如多设备同时登录同账号）突破 Redis 锁后发生重复发单
      const t = await ctx.model.transaction();
      let nextProgress;
      let currentItem;

      try {
        nextProgress = await ctx.model.ShopTaskUserItemProgress.findOne({
          where: {
            shop_task_user_id: shopTaskUser.id,
            user_id: userId,
            status: 0,
            is_processing: 0,
          },
          order: [[ 'id', 'ASC' ]],
          lock: t.LOCK.UPDATE, // 排他锁，锁住这一行，其他并发请求必须等待
          transaction: t,
        });

        if (!nextProgress) {
          // 没有未开始的子项了，说明全部完成，自动将其状态改回 0 (未开启)
          ctx.logger.warn(`[任务埋点] 用户 ${userId} 搜索任务返回 3，原因：没有任何 status=0 且 is_processing=0 的进度，说明当前轮次任务已全部完成`);
          await shopTaskUser.update({ status: 0, task_status: 2 }, { transaction: t });
          await t.commit();
          if (ctx.app.redis) await ctx.app.redis.del(searchLockKey); // 释放锁
          return { sequence_no: 0, task_status: 3, wares: {}, order: {}, is_lucky: 0 };
        }

        // 为了安全，直接将这个子项标记为处理中
        await nextProgress.update({ is_processing: 1 }, { transaction: t });
        await t.commit();

        // 剩下的逻辑不再需要锁，因为该子项已经被标记为处理中
        currentItem = await ctx.model.ShopTaskItem.findOne({ where: { item_id: nextProgress.task_item_id } });
        if (!currentItem) {
          ctx.throw(500, ctx.__('task.task_sub_config_missing'));
        }
      } catch (err) {
        // 捕获异常，回滚事务并释放 Redis 锁
        await t.rollback();
        throw err;
      }

      // 6. 选取商品
      const isLuckyOrder = nextProgress.is_lucky_order !== null ? nextProgress.is_lucky_order : (currentItem ? currentItem.is_lucky_order : 0);
      const appendAmount = nextProgress.append_amount !== null ? Number(nextProgress.append_amount) : (currentItem ? Number(currentItem.append_amount || 0) : 0);
      const ruleType = nextProgress.rule_type !== null ? nextProgress.rule_type : (currentItem ? currentItem.rule_type : 1);

      let yieldRate = 0;
      if (nextProgress.yield_rate !== null && Number(nextProgress.yield_rate) > 0) {
        yieldRate = Number(nextProgress.yield_rate);
      } else if (currentItem && currentItem.yield_rate !== null) {
        yieldRate = Number(currentItem.yield_rate);
      } else if (shopTask && shopTask.yield_rate !== null) {
        yieldRate = Number(shopTask.yield_rate);
      }

      let waresModel = null;
      let goodsPrice = 0;

      // --- 这里加上一层双重保险，如果生成前发现余额不足，直接拒绝 ---
      // (前面 3. 拦截了总余额 < shopTask.min_amount，但幸运订单可能需要 balance+appendAmount，这里更精细拦截)
      if (totalBalance < 0) {
        ctx.throw(400, ctx.__('wallet.balance_not_enough') || '余额不足');
      }

      if (ruleType === 2) {
        // 手动匹配
        const goodsId = nextProgress.goods_id || (currentItem ? currentItem.goods_id : 0);
        if (goodsId) {
          waresModel = await ctx.model.GoodsTask.findOne({ where: { id: goodsId, is_deleted: 0 } });
        }

        const configuredPrice = nextProgress.goods_price !== null ? Number(nextProgress.goods_price) : (currentItem ? Number(currentItem.goods_price || 0) : 0);

        if (!waresModel) {
          // 如果找不到商品，但手动匹配配置了价格和名称，也可以直接用
          const title = nextProgress.goods_title || (currentItem ? currentItem.goods_title : '') || '未知商品';
          waresModel = {
            id: goodsId || 0,
            goods_name: title,
            goods_price: configuredPrice,
            goods_images: [],
          };
        }

        goodsPrice = Number(waresModel.goods_price);

        // 如果是幸运订单且是手动选择，商品价格要根据设置好的价格(configuredPrice)，而不是商品原价
        if (isLuckyOrder === 1 && configuredPrice > 0) {
          goodsPrice = configuredPrice;
        }
      } else {
        // 智能匹配
        // 获取用户最新一次接单的商品ID（仅防连续重复）
        const lastProgress = await ctx.model.ShopTaskUserItemProgress.findOne({
          where: {
            shop_task_user_id: shopTaskUser.id,
            user_id: userId,
            goods_id: { [Op.not]: null },
          },
          order: [[ 'update_time', 'DESC' ]],
          attributes: [ 'goods_id' ],
        });
        const lastGoodsId = lastProgress ? lastProgress.goods_id : null;

        if (isLuckyOrder === 1 && appendAmount > 0) {
          // 幸运订单且有追加金额：搜索价格大于 (余额+追加金额) 的第一条商品，不扫描全表
          const targetPrice = totalBalance + appendAmount;

          ctx.logger.info(`[TaskService.search] 幸运订单商品匹配 -> userId: ${userId}, 余额: ${totalBalance}, 追加金额: ${appendAmount}, 搜索起始价格: ${targetPrice}`);

          const goodsWhere = {
            status: 1,
            is_deleted: 0,
            goods_price: {
              [Op.gt]: targetPrice,
            },
          };

          if (lastGoodsId) {
            goodsWhere.id = { [Op.ne]: lastGoodsId };
          }

          waresModel = await ctx.model.GoodsTask.findOne({
            where: goodsWhere,
            attributes: [ 'id', 'goods_name', 'goods_price', 'goods_images' ],
            order: [[ 'goods_price', 'ASC' ]],
            limit: 1,
          });

          if (!waresModel && lastGoodsId) {
            // 如果加了去重条件没查到，去掉去重条件再查一次
            delete goodsWhere.id;
            waresModel = await ctx.model.GoodsTask.findOne({
              where: goodsWhere,
              attributes: [ 'id', 'goods_name', 'goods_price', 'goods_images' ],
              order: [[ 'goods_price', 'ASC' ]],
              limit: 1,
            });
          }

          if (!waresModel) {
            ctx.throw(400, ctx.__('task.too_many_people_grabbing') || '当前时段抢单人数过多，请稍后再试');
          }

          // 强行把商品价格修改为 用户余额 + 加上追加的金额
          goodsPrice = targetPrice;
        } else {
          // 普通订单：搜索 余额*最小使用率 到 余额*最大使用率 之间的商品
          const balanceMinRate = shopTask.balance_min_rate !== null ? Number(shopTask.balance_min_rate) : 0;
          const balanceMaxRate = shopTask.balance_max_rate !== null ? Number(shopTask.balance_max_rate) : 1;

          let targetGoodsPriceMin = totalBalance * balanceMinRate;
          let targetGoodsPriceMax = totalBalance * balanceMaxRate;

          if (targetGoodsPriceMin > targetGoodsPriceMax) {
            const temp = targetGoodsPriceMin;
            targetGoodsPriceMin = targetGoodsPriceMax;
            targetGoodsPriceMax = temp;
          }

          const goodsWhere = {
            status: 1,
            is_deleted: 0,
            goods_price: {
              [Op.gte]: targetGoodsPriceMin,
              [Op.lte]: targetGoodsPriceMax,
            },
          };

          if (lastGoodsId) {
            goodsWhere.id = { [Op.ne]: lastGoodsId };
          }

          // ① 查询这个价格区间一共有多少条
          let total = await ctx.model.GoodsTask.count({
            where: goodsWhere,
          });

          if (total === 0 && lastGoodsId) {
            // 该区间去重后没商品了，说明都出现过了，或者只有这一份商品，允许新一轮搜索
            delete goodsWhere.id;
            total = await ctx.model.GoodsTask.count({
              where: goodsWhere,
            });
          }

          if (total === 0) {
            let isRetry = false;
            const searchRetryKey = `search_retry:${userId}`;
            if (ctx.app.redis) {
              isRetry = await ctx.app.redis.get(searchRetryKey);
            } else {
              isRetry = true; // 如果没有redis配置，为了避免死循环直接进入重试逻辑
            }

            if (!isRetry) {
              if (ctx.app.redis) {
                await ctx.app.redis.set(searchRetryKey, '1', 'EX', 30);
              }
              ctx.throw(400, ctx.__('task.too_many_people_grabbing') || '当前时段抢单人数过多，请稍后再试');
            } else {
              // 第二次请求调整这个区间
              const minRateNew = Math.max(0, balanceMinRate - 0.2);
              targetGoodsPriceMin = totalBalance * minRateNew;
              targetGoodsPriceMax = totalBalance; // 最大金额直接用用户的余额

              goodsWhere.goods_price = {
                [Op.gte]: targetGoodsPriceMin,
                [Op.lte]: targetGoodsPriceMax,
              };

              total = await ctx.model.GoodsTask.count({
                where: goodsWhere,
              });

              if (total === 0 && lastGoodsId) {
                delete goodsWhere.id;
                total = await ctx.model.GoodsTask.count({
                  where: goodsWhere,
                });
              }

              if (total === 0) {
                // 兜底策略：第二次扩大区间还是找不到商品，放弃价格区间限制，随机返回一个商品
                ctx.logger.warn(`[TaskService.search] 第二次扩大价格区间匹配依然失败 -> userId: ${userId}, 余额: ${totalBalance}, targetGoodsPriceMin: ${targetGoodsPriceMin}, targetGoodsPriceMax: ${targetGoodsPriceMax}. 启动兜底策略(无视价格)...`);
                delete goodsWhere.goods_price;
                total = await ctx.model.GoodsTask.count({
                  where: goodsWhere,
                });

                if (total === 0) {
                  ctx.throw(400, ctx.__('task.too_many_people_grabbing') || '当前时段抢单人数过多，请稍后再试');
                }
              }

              if (ctx.app.redis) {
                await ctx.app.redis.del(searchRetryKey);
              }
            }
          } else {
            if (ctx.app.redis) {
              const searchRetryKey = `search_retry:${userId}`;
              await ctx.app.redis.del(searchRetryKey);
            }
          }

          // ② 生成一个 0 ~ total-1 的随机偏移量 offset
          const offset = Math.floor(Math.random() * total);

          // ③ 使用 LIMIT offset, 1 随机偏移取一条
          // 优化：针对弱网环境，仅查询前端必须的字段，排除冗长的详情文本 (goods_desc, 详情富文本等)
          waresModel = await ctx.model.GoodsTask.findOne({
            where: goodsWhere,
            attributes: [ 'id', 'goods_name', 'goods_price', 'goods_images' ],
            offset,
            limit: 1,
          });

          if (!waresModel) {
            ctx.throw(400, ctx.__('task.too_many_people_grabbing') || '当前时段抢单人数过多，请稍后再试');
          }

          goodsPrice = Number(waresModel.goods_price);
        }
      }

      // 7. 更新进度（生成订单）
      // 优化：修复生成的订单号过长、含有非数字字符可能导致保存日志表时超出字段限制或类型错误 (BIGINT)
      // 确保生成的 orderNo 是纯数字的字符串，以兼容可能用 BIGINT 存储订单号的旧表
      const orderNo = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const cTime = new Date();

      const parentYieldRate = shopTask ? Number(shopTask.parent_yield_rate || 0) : 0;

      const revenue = goodsPrice * yieldRate;

      // 因为之前已经去掉了事务 t (为了缩小锁的范围)，这里使用普通的 update 即可，避免死锁
      await nextProgress.update({
        order_id: orderNo,
        goods_id: waresModel.id,
        goods_price: goodsPrice,
        goods_title: waresModel.goods_name,
        revenue,
        is_processing: 1,
        is_triggered: 1,
        update_time: cTime,
      });

      let picUrl = '';
      if (waresModel) {
        if (waresModel.goods_images) {
          try {
            let images = waresModel.goods_images;
            // 如果数据库里存的是 JSON 字符串，尝试解析它
            if (typeof images === 'string') {
              images = JSON.parse(images);
            }
            if (Array.isArray(images) && images.length > 0) {
              picUrl = images[0];
            }
          } catch (err) {
            ctx.logger.warn(`[TaskService.search] 商品图片解析失败, goods_id: ${waresModel.id}, images: ${waresModel.goods_images}`);
            picUrl = ''; // 解析失败则返回空，防止前端报错
          }
        }
      }

      const wares = {
        goods_id: waresModel.id,
        wares_name: waresModel.goods_name,
        total_price: goodsPrice,
        pic_url: picUrl,
      };

      const order = {
        order_id: orderNo,
        total_price: goodsPrice,
        revenue_rate: yieldRate, // 收益率
        return_money: revenue, // 回报金额(即静态收益)
        parent_revenue_rate: parentYieldRate,
        parent_revenue: revenue * parentYieldRate, // 动态收益 = 静态收益 * 上级收益率
        order_type: isLuckyOrder === 1 ? 2 : 1, // 1:普通订单, 2:幸运订单
        c_time: cTime,
      };

      return {
        sequence_no: currentItem.sort,
        task_status: 2,
        wares,
        order,
        is_lucky: isLuckyOrder,
      };
    } catch (err) {
      if (ctx.app.redis) await ctx.app.redis.del(searchLockKey);
      throw err;
    }
  }
}

module.exports = TaskService;
