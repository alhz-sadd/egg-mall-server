'use strict';

const Controller = require('egg').Controller;

class AdminOuterTaskController extends Controller {
  /**
   * B端获取本店任务列表
   * GET /api/admin-outer/tasks
   */
  async index() {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    const { page = 1, page_size = 10, task_name, status } = ctx.query;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const where = {
      shop_id: adminOuter.shop_id,
      is_deleted: 0,
    };

    if (task_name) {
      where.task_name = { [Op.like]: '%' + task_name + '%' };
    }
    if (status !== undefined && status !== '') {
      where.status = parseInt(status);
    }

    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;

    const result = await ctx.model.ShopTask.findAndCountAll({
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
   * B端获取任务详情
   * GET /api/admin-outer/tasks/:id
   */
  async show() {
    const { ctx, app } = this;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const id = ctx.params.id;
    const task = await ctx.model.ShopTask.findOne({
      where: { task_id: id, shop_id: adminOuter.shop_id, is_deleted: 0 },
      include: [
        {
          model: app.model.ShopTaskItem,
          as: 'items',
          where: { is_deleted: 0 },
          required: false,
        },
      ],
      order: [
        [{ model: app.model.ShopTaskItem, as: 'items' }, 'sort', 'ASC' ],
      ],
    });

    if (!task) {
      ctx.throw(404, '任务不存在');
    }
    
    // 转换为符合前端期望的分页格式
    const taskJson = task.toJSON();
    const items = taskJson.items || [];
    
    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        total: items.length,
        rows: items
      },
    };
  }

  /**
   * B端创建任务
   * POST /api/admin-outer/tasks
   */
  async create() {
    const { ctx } = this;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const payload = ctx.request.body;
    ctx.validate({
      task_name: { type: 'string', required: true },
      min_amount: { type: 'number', required: false },
      yield_rate: { type: 'number', required: false },
      parent_yield_rate: { type: 'number', required: false },
      task_count: { type: 'int', required: false },
      balance_min_rate: { type: 'number', required: false },
      balance_max_rate: { type: 'number', required: false },
      status: { type: 'int', required: false }, // 0=停用 1=启用
    }, payload);

    payload.shop_id = adminOuter.shop_id;

    // 使用事务确保主表和子表数据的一致性
    const transaction = await ctx.model.transaction();
    let task;
    try {
      task = await ctx.model.ShopTask.create(payload, { transaction });

      // 根据任务单数 task_count，批量在 shop_task_item 插入对应条数的数据
      if (payload.task_count && payload.task_count > 0) {
        const items = [];
        for (let i = 1; i <= payload.task_count; i++) {
          items.push({
            task_id: task.task_id,
            item_type: 1, // 默认普通订单任务
            sort: i,
            require_count: 1,
            yield_rate: payload.yield_rate || 0, // 继承主任务收益率
            is_lucky_order: 0,
            rule_type: null, // 默认空
            append_amount: 0,
            goods_price: 0,
            goods_title: null,
            goods_id: null,
          });
        }
        await ctx.model.ShopTaskItem.bulkCreate(items, { transaction });
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: task,
    };
  }

  /**
   * B端修改任务
   * PUT /api/admin-outer/tasks/:id
   */
  async update() {
    const { ctx, app } = this;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const id = ctx.params.id;
    const payload = ctx.request.body;

    ctx.validate({
      task_name: { type: 'string', required: false },
      min_amount: { type: 'number', required: false },
      yield_rate: { type: 'number', required: false },
      parent_yield_rate: { type: 'number', required: false },
      task_count: { type: 'int', required: false },
      balance_min_rate: { type: 'number', required: false },
      balance_max_rate: { type: 'number', required: false },
      status: { type: 'int', required: false },
    }, payload);

    const transaction = await ctx.model.transaction();
    let updatedTask;

    try {
      const task = await ctx.model.ShopTask.findOne({
        where: { task_id: id, shop_id: adminOuter.shop_id, is_deleted: 0 },
        include: [
          {
            model: app.model.ShopTaskItem,
            as: 'items',
            where: { is_deleted: 0 },
            required: false,
          },
        ],
        transaction,
      });

      if (!task) {
        ctx.throw(404, '任务不存在');
      }

      // 如果传入了 task_count，则同步修改任务子项
      if (payload.task_count !== undefined && payload.task_count !== null) {
        const new_task_count = parseInt(payload.task_count);
        const current_items = task.items || [];
        const current_item_count = current_items.length;

        if (new_task_count > current_item_count) {
          // 需要新增子项
          const itemsToCreate = [];
          for (let i = current_item_count + 1; i <= new_task_count; i++) {
            itemsToCreate.push({
              task_id: task.task_id,
              item_type: 1, // 默认普通订单任务
              sort: i,
              require_count: 1,
              yield_rate: payload.yield_rate || task.yield_rate || 0, // 继承主任务或旧主任务收益率
              is_lucky_order: 0,
              rule_type: null,
              append_amount: 0,
              goods_price: 0,
              goods_title: null,
              goods_id: null,
            });
          }
          await ctx.model.ShopTaskItem.bulkCreate(itemsToCreate, { transaction });
        } else if (new_task_count < current_item_count) {
          // 需要删除多余子项（软删除）
          const itemsToDelete = current_items
            .filter((_, index) => index >= new_task_count)
            .map(item => item.item_id);

          if (itemsToDelete.length > 0) {
            await ctx.model.ShopTaskItem.update(
              { is_deleted: 1 },
              { where: { item_id: itemsToDelete }, transaction }
            );
          }
        }
      }

      // 更新主任务信息
      updatedTask = await task.update(payload, { transaction });

      await transaction.commit();

      ctx.body = {
        code: 200,
        message: '修改成功',
        data: updatedTask,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * B端删除任务(软删)
   * DELETE /api/admin-outer/tasks/:id
   */
  async destroy() {
    const { ctx } = this;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const id = ctx.params.id;
    const task = await ctx.model.ShopTask.findOne({
      where: { task_id: id, shop_id: adminOuter.shop_id, is_deleted: 0 },
    });

    if (!task) {
      ctx.throw(404, '任务不存在');
    }

    await task.update({
      is_deleted: 1,
    });

    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }

  /**
   * B端修改任务子项
   * PUT /api/admin-outer/tasks/items/:item_id
   */
  async updateItem() {
    const { ctx } = this;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const item_id = ctx.params.item_id;
    const payload = ctx.request.body;

    ctx.validate({
      is_lucky_order: { type: 'int', required: false }, // 0否 1是
      yield_rate: { type: 'number', required: false }, // 收益率
      rule_type: { type: 'int', required: false }, // 1=智能匹配，2=手动匹配
      append_amount: { type: 'number', required: false }, // 追加金额
      goods_price: { type: 'number', required: false }, // 商品价格
      goods_title: { type: 'string', required: false }, // 商品标题
      goods_id: { type: 'int', required: false }, // 商品ID
    }, payload);

    const item = await ctx.model.ShopTaskItem.findOne({
      where: { item_id, is_deleted: 0 },
      include: [
        {
          model: ctx.model.ShopTask,
          as: 'task',
          where: { shop_id: adminOuter.shop_id, is_deleted: 0 }, // 确保修改的是自己店铺的任务子项
        },
      ],
    });

    if (!item) {
      ctx.throw(404, '任务子项不存在或无权操作');
    }

    // 如果修改为普通订单 (is_lucky_order === 0)，则将子项的收益率同步为主任务的收益率，并且将规则相关的字段重置
    if (payload.is_lucky_order === 0) {
      payload.yield_rate = item.task.yield_rate; // 同步为主任务的收益率
      payload.rule_type = null;
      payload.append_amount = 0;
      payload.goods_price = 0;
      payload.goods_title = '';
      payload.goods_id = null;
    }

    await item.update(payload);

    ctx.body = {
      code: 200,
      message: '修改任务子项成功',
      data: item,
    };
  }

  /**
   * B端修改用户已绑定的任务子项
   * PUT /api/admin-outer/tasks/user-items/:id
   */
  async updateUserItem() {
    const { ctx } = this;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const id = ctx.params.id;
    const payload = ctx.request.body;

    ctx.validate({
      user_id: { type: 'int', required: false }, // 支持通过 user_id + task_item_id 定位
      is_lucky_order: { type: 'int', required: false }, // 0否 1是
      yield_rate: { type: 'number', required: false }, // 收益率
      rule_type: { type: 'int', required: false }, // 1=智能匹配，2=手动匹配
      append_amount: { type: 'number', required: false }, // 追加金额
      goods_price: { type: 'number', required: false }, // 商品价格
      goods_title: { type: 'string', required: false }, // 商品标题
      goods_id: { type: 'int', required: false }, // 商品ID
    }, payload);

    let itemProgress;

    // 如果前端传了 user_id，则认为 URL 中的 id 是 task_item_id
    if (payload.user_id) {
      itemProgress = await ctx.model.ShopTaskUserItemProgress.findOne({
        where: { task_item_id: id, user_id: payload.user_id, is_deleted: 0 },
        include: [
          {
            model: ctx.model.SysUser,
            as: 'user',
            where: { shop_id: adminOuter.shop_id },
          }
        ],
        order: [['id', 'DESC']] // 取最新的绑定记录
      });
    } else {
      // 否则认为 URL 中的 id 是 progress_id
      itemProgress = await ctx.model.ShopTaskUserItemProgress.findOne({
        where: { id, is_deleted: 0 },
        include: [
          {
            model: ctx.model.SysUser,
            as: 'user',
            where: { shop_id: adminOuter.shop_id },
          }
        ],
      });
    }

    if (!itemProgress) {
      ctx.throw(404, '已绑定的任务子项不存在或无权操作');
    }

    if (itemProgress.is_processing === 1 || itemProgress.status !== 0) {
      ctx.throw(400, '当前任务子项正在进行中或已完成，无法修改');
    }

    const updateData = { ...payload };
    delete updateData.user_id; // 不更新 user_id

    await itemProgress.update(updateData);

    ctx.body = {
      code: 200,
      message: '修改用户已绑定任务子项成功',
      data: itemProgress,
    };
  }

  /**
   * B端给用户绑定任务模板
   * POST /api/admin-outer/tasks/bind-user
   */
  async bindUser() {
    const { ctx } = this;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const { user_id, task_id } = ctx.request.body;

    if (!user_id || !task_id) {
      ctx.throw(400, '用户ID和任务ID不能为空');
    }

    // 校验任务是否存在且属于本店
    const task = await ctx.model.ShopTask.findOne({
      where: { task_id, shop_id: adminOuter.shop_id, is_deleted: 0 },
    });

    if (!task) {
      ctx.throw(404, '任务模板不存在或无权操作');
    }

    // 校验用户是否存在且属于本店
    const user = await ctx.model.SysUser.findOne({
      where: { user_id, shop_id: adminOuter.shop_id, user_type: 4 },
    });

    if (!user) {
      ctx.throw(404, 'C端用户不存在或无权操作');
    }

    // 校验用户是否在执行任务中 (status === 1)
    const currentTaskUser = await ctx.model.ShopTaskUser.findOne({
      where: { user_id, status: { [ctx.model.Sequelize.Op.in]: [0, 1] } },
      order: [['id', 'DESC']]
    });

    if (currentTaskUser && currentTaskUser.status === 1) {
      ctx.throw(400, '用户当前任务正在执行中，无法切换模板，请先关闭当前任务或等待任务完成');
    }

    // 用户只能绑定一个任务模板。切换新的模板后，需要删除之前绑定的任务及子项，确保只有一条规则
    const transaction = await ctx.model.transaction();
    let bindRecord;
    try {
      // 删除该用户之前所有的进度子项
      await ctx.model.ShopTaskUserItemProgress.destroy({
        where: { user_id },
        transaction,
        force: true
      });

      // 删除该用户之前所有的绑定记录
      await ctx.model.ShopTaskUser.destroy({
        where: { user_id },
        transaction,
        force: true
      });

      // 绑定新的模板，状态默认为未开启 (0)
      bindRecord = await ctx.model.ShopTaskUser.create({
        user_id,
        task_id,
        status: 0,
        task_status: 0,
      }, { transaction });

      // 查询模板的所有子项
      const taskItems = await ctx.model.ShopTaskItem.findAll({
        where: { task_id, is_deleted: 0 },
        order: [['sort', 'ASC']],
        transaction
      });

      // 绑定时即初始化子项进度，方便在未开启前修改特定用户的配置
      if (taskItems.length > 0) {
        const progressItems = taskItems.map(item => ({
          shop_task_user_id: bindRecord.id,
          user_id,
          task_item_id: item.item_id,
          is_lucky_order: item.is_lucky_order,
          yield_rate: item.yield_rate,
          rule_type: item.rule_type,
          append_amount: item.append_amount,
          goods_price: item.goods_price,
          goods_title: item.goods_title,
          goods_id: item.goods_id,
          status: 0, // 未完成
          revenue: 0.00000,
          is_triggered: 0,
          is_processing: 0,
        }));
        await ctx.model.ShopTaskUserItemProgress.bulkCreate(progressItems, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    ctx.body = {
      code: 200,
      message: '绑定成功',
      data: bindRecord,
    };
  }

  /**
   * B端开启用户任务
   * POST /api/admin-outer/tasks/start-user
   */
  async startUserTask() {
    const { ctx } = this;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const { user_id, task_id } = ctx.request.body;

    if (!user_id || !task_id) {
      ctx.throw(400, '用户ID和任务ID不能为空');
    }

    // 查询最新的绑定记录（按 ID 倒序，防止查询到历史失效的记录）
    const userTask = await ctx.model.ShopTaskUser.findOne({
      where: { user_id, task_id },
      order: [['id', 'DESC']]
    });

    if (!userTask) {
      ctx.throw(404, '用户尚未绑定此任务模板');
    }

    if (userTask.status !== 0) {
      ctx.throw(400, '任务非“已绑定”状态，无法开启');
    }

    const transaction = await ctx.model.transaction();
    try {
      // 1. 更新主任务状态为进行中
      await userTask.update({ status: 1 }, { transaction });

      // 注：不再在此初始化子项，改为在 bindUser 绑定时即生成，以支持绑定后开启前修改子项

      await transaction.commit();

      ctx.body = {
        code: 200,
        message: '任务开启成功',
      };
    } catch (error) {
      await transaction.rollback();
      ctx.logger.error('[AdminOuterTaskController.startUserTask] 开启任务失败', error);
      ctx.throw(500, '开启任务失败：' + error.message);
    }
  }
  /**
   * B端关闭用户任务
   * POST /api/admin-outer/tasks/close-user
   */
  async closeUserTask() {
    const { ctx } = this;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未授权或未绑定店铺');
    }

    const { user_id, task_id } = ctx.request.body;

    if (!user_id || !task_id) {
      ctx.throw(400, '用户ID和任务ID不能为空');
    }

    // 查询最新的绑定记录（按 ID 倒序）
    const userTask = await ctx.model.ShopTaskUser.findOne({
      where: { user_id, task_id },
      order: [['id', 'DESC']]
    });

    if (!userTask) {
      ctx.throw(404, '用户尚未绑定此任务模板');
    }

    if (userTask.status !== 1) {
      ctx.throw(400, '任务非“执行中”状态，无法关闭');
    }

    // 检查用户是否已经搜索过（即是否有已经生成的订单或已支付的子项）
    const triggeredProgress = await ctx.model.ShopTaskUserItemProgress.findOne({
      where: {
        shop_task_user_id: userTask.id,
        user_id,
        [ctx.app.Sequelize.Op.or]: [
          { is_triggered: 1 },
          { status: 1 }
        ]
      }
    });

    // 只要用户搜索过（或支付过），就不允许关闭
    if (triggeredProgress) {
      ctx.throw(400, '用户已经接取或完成过订单，无法关闭任务');
    }

    await userTask.update({ status: 0 }); // 恢复到未开启（已绑定）状态

    ctx.body = {
      code: 200,
      message: '任务关闭成功',
    };
  }
}

module.exports = AdminOuterTaskController;
