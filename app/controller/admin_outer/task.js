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

    await item.update(payload);

    ctx.body = {
      code: 200,
      message: '修改任务子项成功',
      data: item,
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

    // 用户只能绑定一个任务模板。如果已绑定其他任务，则删除旧的绑定数据及对应的进度数据
      const existBinds = await ctx.model.ShopTaskUser.findAll({
        where: { user_id },
      });

      if (existBinds && existBinds.length > 0) {
        for (const oldBind of existBinds) {
          // 删除关联的进度表数据
          await ctx.model.ShopTaskUserItemProgress.destroy({
            where: { user_task_id: oldBind.id }
          });
          // 删除主绑定记录
          await oldBind.destroy();
        }
      }

      const bindRecord = await ctx.model.ShopTaskUser.create({
      user_id,
      task_id,
      status: 0,
      task_status: 0,
    });

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

    // 查询绑定记录
    const userTask = await ctx.model.ShopTaskUser.findOne({
      where: { user_id, task_id },
    });

    if (!userTask) {
      ctx.throw(404, '用户尚未绑定此任务模板');
    }

    if (userTask.task_status !== 0) {
      ctx.throw(400, '任务非“已绑定”状态，无法开启');
    }

    // 查询模板的所有子项
    const taskItems = await ctx.model.ShopTaskItem.findAll({
      where: { task_id, is_deleted: 0 },
      order: [['sort', 'ASC']],
    });

    const transaction = await ctx.model.transaction();
    try {
      // 1. 更新主任务状态为进行中
      await userTask.update({ task_status: 1 }, { transaction });

      // 2. 初始化子项进度
        if (taskItems.length > 0) {
          const progressItems = taskItems.map(item => ({
            user_task_id: userTask.id,
            user_id,
            task_item_id: item.item_id,
            status: 0, // 未完成
            revenue: 0.00000,
            is_triggered: 0,
            is_processing: 0,
          }));
        await ctx.model.ShopTaskUserItemProgress.bulkCreate(progressItems, { transaction });
      }

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
}

module.exports = AdminOuterTaskController;
