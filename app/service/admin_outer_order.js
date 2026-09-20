'use strict';

const Service = require('egg').Service;

class AdminOuterOrderService extends Service {
  async getAllowedUserIds(currentUser) {
    const { ctx } = this;
    const { Op } = ctx.app.Sequelize;
    let allowedUserIds = [];

    if (currentUser.user_type === 3) {
      // 业务员：获取自己直推和裂变的所有下级客户
      const directRelations = await ctx.model.CustomerRelation.findAll({
        where: {
          root_salesman_user_id: currentUser.user_id,
          is_deleted: 0,
        },
        attributes: [ 'c_user_id' ],
      });

      let currentLevelIds = directRelations.map(r => r.c_user_id);
      const allDescendantIds = new Set(currentLevelIds);

      while (currentLevelIds.length > 0) {
        const children = await ctx.model.CustomerRelation.findAll({
          where: {
            parent_customer_user_id: { [Op.in]: currentLevelIds },
            is_deleted: 0,
          },
          attributes: [ 'c_user_id' ],
        });

        currentLevelIds = [];
        for (const child of children) {
          if (!allDescendantIds.has(child.c_user_id)) {
            allDescendantIds.add(child.c_user_id);
            currentLevelIds.push(child.c_user_id);
          }
        }
      }

      if (allDescendantIds.size > 0) {
        allowedUserIds = Array.from(allDescendantIds);
      }
    } else if (currentUser.user_type === 2) {
      // 店长：获取店铺下的所有客户
      const shopRelations = await ctx.model.CustomerRelation.findAll({
        where: { shop_id: currentUser.shop_id, is_deleted: 0 },
        attributes: [ 'c_user_id' ],
      });
      const shopUserIds = shopRelations.map(r => r.c_user_id);
      if (shopUserIds.length > 0) {
        allowedUserIds = shopUserIds;
      }
    }
    return allowedUserIds;
  }

  /**
   * B端获取订单列表 (基于任务进度表)
   */
  async getOrderList(query, currentUser) {
    const { ctx } = this;
    const { Op } = ctx.app.Sequelize;
    const {
      page = 1,
      page_size = 10,
      user_id,
      order_id,
      status, // 0未完成, 1已完成
      is_triggered, // 0未触发, 1已触发
      start_time,
      end_time,
    } = query;

    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;

    const where = { is_deleted: 0 };

    if (order_id) {
      where.order_id = { [Op.like]: `%${order_id}%` };
    }
    if (status !== undefined && status !== '') {
      where.status = status;
    }
    if (is_triggered !== undefined && is_triggered !== '') {
      where.is_triggered = is_triggered;
    }
    if (start_time || end_time) {
      where.create_time = {};
      if (start_time) where.create_time[Op.gte] = new Date(start_time);
      if (end_time) where.create_time[Op.lte] = new Date(end_time);
    }

    // 权限隔离逻辑
    let allowedUserIds = await this.getAllowedUserIds(currentUser);

    if (allowedUserIds.length === 0) {
      return { list: [], total: 0 };
    }

    // 合并前端传来的指定 user_id 查询条件
    if (user_id) {
      if (allowedUserIds.includes(parseInt(user_id))) {
        where.user_id = user_id;
      } else {
        return { list: [], total: 0 }; // 越权查询，返回空
      }
    } else {
      where.user_id = { [Op.in]: allowedUserIds };
    }

    // 查询分页数据
    const { rows, count } = await ctx.model.ShopTaskUserItemProgress.findAndCountAll({
      where,
      limit,
      offset,
      order: [[ 'create_time', 'DESC' ]],
    });

    // 查询用户名映射
    let list = [];
    if (rows.length > 0) {
      const userIdsInPage = [...new Set(rows.map(r => r.user_id))];
      const progressIds = rows.map(r => r.id);

      // 查询用户信息
      const users = await ctx.model.SysUser.findAll({
        where: { user_id: { [Op.in]: userIdsInPage } },
        attributes: ['user_id', 'username']
      });
      
      const userMap = {};
      users.forEach(u => {
        userMap[u.user_id] = u.username;
      });

      // 查询订单对应的动态收益 (从钱包流水表查 biz_type: 5 且 related_order_id 为进度ID的记录)
      const dynamicLogs = await ctx.model.UserWalletLog.findAll({
        where: {
          biz_type: 5,
          related_order_id: { [Op.in]: progressIds }
        },
        attributes: ['related_order_id', 'amount']
      });

      const dynamicMap = {};
      dynamicLogs.forEach(log => {
        // 如果有多次记录，这里累加处理
        dynamicMap[log.related_order_id] = (dynamicMap[log.related_order_id] || 0) + parseFloat(log.amount);
      });

      // 获取任务模板信息以计算预期动态佣金
      const taskItemIds = [...new Set(rows.map(r => r.task_item_id))];
      const taskItems = await ctx.model.ShopTaskItem.findAll({
        where: { item_id: { [Op.in]: taskItemIds } },
        attributes: ['item_id', 'task_id']
      });

      const itemToTaskMap = {};
      const taskIds = new Set();
      taskItems.forEach(item => {
        itemToTaskMap[item.item_id] = item.task_id;
        taskIds.add(item.task_id);
      });

      const tasks = await ctx.model.ShopTask.findAll({
        where: { task_id: { [Op.in]: Array.from(taskIds) } },
        attributes: ['task_id', 'parent_yield_rate']
      });

      const taskRateMap = {};
      tasks.forEach(task => {
        taskRateMap[task.task_id] = parseFloat(task.parent_yield_rate || 0);
      });

      list = rows.map(row => {
        const data = row.toJSON();
        data.username = userMap[data.user_id] || '未知用户';
        // 静态佣金(收益) 对应表中的 revenue
        data.static_commission = data.revenue;
        
        // 预期动态佣金计算：商品价格 * 上级收益率
        const taskId = itemToTaskMap[data.task_item_id];
        const parentYieldRate = taskId ? (taskRateMap[taskId] || 0) : 0;
        const goodsPrice = parseFloat(data.goods_price || 0);
        const expectedDynamicCommission = (goodsPrice * parentYieldRate).toFixed(5);

        // 动态佣金(收益)：优先使用流水表中实际发出的金额(针对已完成)，若无则展示计算得出的预期金额
        data.dynamic_commission = dynamicMap[data.id] || expectedDynamicCommission;
        return data;
      });
    }

    return {
      list,
      total: count,
    };
  }
  /**
   * B端获取订单详情(收益列表)
   */
  async getOrderDetail(id, currentUser) {
    const { ctx } = this;
    const { Op } = ctx.app.Sequelize;

    // 1. 查询订单基本信息，校验权限
    const progress = await ctx.model.ShopTaskUserItemProgress.findOne({
      where: { id, is_deleted: 0 }
    });

    if (!progress) {
      ctx.throw(404, '订单不存在');
    }

    const allowedUserIds = await this.getAllowedUserIds(currentUser);
    if (!allowedUserIds.includes(progress.user_id)) {
      ctx.throw(403, '无权限查看该订单明细');
    }

    // 2. 从 user_wallet_log 查询该订单对应的静态收益(biz_type=4)和动态收益(biz_type=5)
    const logs = await ctx.model.UserWalletLog.findAll({
      where: {
        related_order_id: id,
        biz_type: { [Op.in]: [ 4, 5 ] }
      },
      order: [[ 'create_time', 'ASC' ]],
      include: [
        {
          model: ctx.model.SysUser,
          as: 'user',
          attributes: ['user_id', 'username']
        }
      ]
    });

    // 3. 组装返回数据结构
    // 1=静态收入(自己), 2=动态收入(上级)
    const result = logs.map(log => {
      const data = log.toJSON();
      return {
        user_id: data.user_id,
        username: data.user ? data.user.username : '未知用户',
        log_no: data.log_no,
        amount: data.amount,
        type: data.biz_type === 4 ? 1 : 2, // 1=静态收入, 2=动态收入
        create_time: data.create_time,
      };
    });

    return result;
  }
}

module.exports = AdminOuterOrderService;
