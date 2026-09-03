'use strict';

const Service = require('egg').Service;

/**
 * 策略服务层
 * 处理管理端策略列表的增删改查
 */
class StrategyService extends Service {
  /**
   * 校验分页参数
   * @param {Object} query 查询参数
   * @return {Object} 处理后的分页参数
   */
  parsePagination(query = {}) {
    let { page = 1, page_size = 10 } = query;
    page = Math.max(1, Number(page) || 1);
    page_size = Number(page_size) || 10;
    page_size = Math.min(100, Math.max(1, page_size));
    return { page, page_size, offset: (page - 1) * page_size };
  }

  /**
   * 管理端获取策略列表
   * @param {Object} query 查询参数
   * @param {number} adminId 店铺ID (当前登录管理员ID)
   * @return {Object} 分页结果 { list, pagination }
   */
  async adminList(query = {}, adminId) {
    const { ctx } = this;
    const { keyword, type, status } = query;
    const { page: pageNum, page_size: size, offset } = this.parsePagination(query);

    const where = {};
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    if (type !== undefined && type !== '') {
      where.type = Number(type);
    }
    if (status !== undefined && status !== '') {
      where.status = Number(status);
    }
    if (keyword !== undefined && keyword !== '') {
      where.name = { [ctx.app.Sequelize.Op.like]: `%${keyword}%` };
    }

    const { count, rows } = await ctx.model.Strategy.findAndCountAll({
      where,
      order: [[ 'id', 'DESC' ]],
      offset,
      limit: size,
    });

    return {
      list: rows,
      pagination: {
        total: count,
        page: pageNum,
        page_size: size,
        total_pages: Math.ceil(count / size),
      },
    };
  }

  /**
   * 管理端获取策略详情
   * @param {number} id 策略ID
   * @param {number} adminId 店铺ID (当前登录管理员ID)
   * @return {Object|null} 策略详情
   */
  async adminShow(id, adminId) {
    const { ctx } = this;
    const strategy = await ctx.model.Strategy.findByPk(id);
    if (strategy && adminId !== undefined && strategy.admin_id !== adminId) {
      return null;
    }
    return strategy;
  }

  /**
   * 转换比率字段
   * 前端传整数百分比（如 33）或小数（如 0.33）都统一转为小数存储
   * @param {*} value 原始值
   * @return {number} 转换后的小数值
   */
  parseRate(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return 0;
    // 大于 1 视为百分比形式（33 表示 33%），转换为 0.33
    return num > 1 ? num / 100 : num;
  }

  /**
   * 管理端创建策略
   * @param {Object} payload 策略参数
   * @param {number} adminId 店铺ID
   * @return {Object} 创建的策略
   */
  async adminCreate(payload, adminId) {
    const { ctx } = this;

    ctx.assert(payload.name, 422, '策略名不能为空');
    ctx.assert(adminId, 422, '关联店铺ID不能为空');

    const strategy = await ctx.model.Strategy.create({
      admin_id: adminId,
      name: payload.name,
      min_amount: payload.min_amount !== undefined ? Number(payload.min_amount) : 0,
      profit_rate: payload.profit_rate !== undefined ? this.parseRate(payload.profit_rate) : 0,
      parent_profit_rate: payload.parent_profit_rate !== undefined ? this.parseRate(payload.parent_profit_rate) : 0,
      type: payload.type !== undefined ? Number(payload.type) : 0,
      status: payload.status !== undefined ? Number(payload.status) : 0,
      verify_parent: payload.verify_parent !== undefined ? Number(payload.verify_parent) : 0,
      daily_task_update: payload.daily_task_update !== undefined ? Number(payload.daily_task_update) : 0,
      lucky_order_team_reward: payload.lucky_order_team_reward !== undefined ? Number(payload.lucky_order_team_reward) : 0,
      task_count: payload.task_count !== undefined ? Number(payload.task_count) : 0,
      min_usage_rate: payload.min_usage_rate !== undefined ? this.parseRate(payload.min_usage_rate) : 0,
      max_usage_rate: payload.max_usage_rate !== undefined ? this.parseRate(payload.max_usage_rate) : 0,
    });

    // 根据任务单数自动生成规则项
    await this.generateRules(strategy);

    return strategy;
  }

  /**
   * 根据策略生成规则项
   * @param {Object} strategy 策略对象
   */
  async generateRules(strategy) {
    const { ctx } = this;
    const taskCount = Number(strategy.task_count) || 0;
    const strategyId = Number(strategy.id);
    const baseRuleId = 2110;

    if (taskCount <= 0) return;

    const rules = [];
    for (let i = 1; i <= taskCount; i++) {
      rules.push({
        strategy_id: strategyId,
        rule_model_id: baseRuleId + i,
        num: i,
        rule_type: 0,
        match_type: 0,
        status: 0,
        back_rate: strategy.profit_rate || 0,
      });
    }

    await ctx.model.StrategyRule.bulkCreate(rules);
  }

  /**
   * 查询策略规则列表
   * @param {number} strategyId 策略ID
   * @return {Array} 规则列表
   */
  async adminRuleList(strategyId) {
    const { ctx } = this;
    return await ctx.model.StrategyRule.findAll({
      where: { strategy_id: strategyId },
      order: [[ 'num', 'ASC' ]],
    });
  }

  /**
   * 更新策略规则项
   * @param {number} strategyId 策略ID
   * @param {number} ruleModelId 规则模型ID
   * @param {Object} payload 更新参数
   * @return {Object} 更新后的规则
   */
  async adminUpdateRule(strategyId, ruleModelId, payload) {
    const { ctx } = this;

    // 支持 rule_model_id 或 num（序号）作为路径参数
    const numValue = Number(ruleModelId);
    let where = { strategy_id: strategyId };
    if (!Number.isNaN(numValue)) {
      where = {
        strategy_id: strategyId,
        [ctx.app.Sequelize.Op.or]: [
          { rule_model_id: numValue },
          { num: numValue },
        ],
      };
    }

    const rule = await ctx.model.StrategyRule.findOne({ where });

    if (!rule) {
      ctx.throw(404, '策略规则不存在');
    }

    const updateData = {};

    const fieldMap = {
      rule_type: [ 'ruleType', 'rule_type', 'task_type' ],
      match_type: [ 'matchType', 'match_type' ],
      is_trigger: [ 'isTrriger', 'is_trigger', 'isTrigger' ],
      is_run: [ 'isRun', 'is_run' ],
      admin_set_wares_name: [ 'adminSetWaresName', 'admin_set_wares_name', 'product_name' ],
      wares_id: [ 'waresId', 'wares_id', 'product_id' ],
      back_rate: [ 'backRate', 'back_rate', 'yield_rate' ],
      admin_set_price: [ 'adminSetPrice', 'admin_set_price', 'product_amount' ],
      add_money: [ 'addMoney', 'add_money' ],
      back_money: [ 'backMoney', 'back_money' ],
      status: [ 'status' ],
      remark: [ 'remark' ],
      num: [ 'num' ],
    };

    for (const [ dbField, payloadFields ] of Object.entries(fieldMap)) {
      for (const payloadField of payloadFields) {
        if (payload[payloadField] !== undefined && payload[payloadField] !== '') {
          if (dbField === 'back_rate') {
            updateData[dbField] = this.parseRate(payload[payloadField]);
          } else if ([ 'wares_id', 'admin_set_price', 'add_money', 'back_money', 'status', 'num', 'rule_type', 'match_type' ].includes(dbField)) {
            updateData[dbField] = Number(payload[payloadField]);
          } else {
            updateData[dbField] = payload[payloadField];
          }
          break;
        }
      }
    }

    await rule.update(updateData);
    return rule;
  }

  /**
   * 管理端更新策略
   * @param {number} id 策略ID
   * @param {Object} payload 更新参数
   * @param {number} adminId 店铺ID (当前登录管理员ID)
   * @return {Object} 更新后的策略
   */
  async adminUpdate(id, payload, adminId) {
    const { ctx } = this;
    const strategy = await ctx.model.Strategy.findByPk(id);
    if (!strategy) {
      ctx.throw(404, '策略不存在');
    }
    if (adminId !== undefined && strategy.admin_id !== adminId) {
      ctx.throw(403, '无权操作该店铺的策略');
    }

    const updateData = {};
    const rateFields = [ 'profit_rate', 'parent_profit_rate', 'min_usage_rate', 'max_usage_rate' ];
    const numberFields = [
      'min_amount', 'type', 'status', 'verify_parent', 'daily_task_update',
      'lucky_order_team_reward', 'task_count',
    ];

    if (payload.name !== undefined && payload.name !== '') {
      updateData.name = payload.name;
    }

    for (const field of rateFields) {
      if (payload[field] !== undefined && payload[field] !== '') {
        updateData[field] = this.parseRate(payload[field]);
      }
    }

    for (const field of numberFields) {
      if (payload[field] !== undefined && payload[field] !== '') {
        updateData[field] = Number(payload[field]);
      }
    }

    const oldTaskCount = Number(strategy.task_count);
    const oldProfitRate = strategy.profit_rate;

    await strategy.update(updateData);

    // 如果设置为默认状态，当前店铺的其他策略全部改为自定义状态，确保本店铺只允许有一条默认策略
    if (updateData.type !== undefined && Number(updateData.type) === 0) {
      await ctx.model.Strategy.update(
        { type: 1 },
        {
          where: {
            id: { [ctx.app.Sequelize.Op.ne]: id },
            admin_id: strategy.admin_id,
          },
        },
      );
    }

    // 如果任务单数变化，重新生成规则项
    if (updateData.task_count !== undefined && Number(updateData.task_count) !== oldTaskCount) {
      await ctx.model.StrategyRule.destroy({ where: { strategy_id: id } });
      const updatedStrategy = await ctx.model.Strategy.findByPk(id);
      await this.generateRules(updatedStrategy);
    }

    // 如果收益率变化，同步更新所有规则项的 back_rate
    if (updateData.profit_rate !== undefined && Number(updateData.profit_rate) !== Number(oldProfitRate)) {
      await ctx.model.StrategyRule.update(
        { back_rate: updateData.profit_rate },
        { where: { strategy_id: id } },
      );
    }

    return strategy;
  }

  /**
   * 管理端删除策略（物理删除）
   * @param {number} id 策略ID
   * @param {number} adminId 店铺ID (当前登录管理员ID)
   */
  async adminDestroy(id, adminId) {
    const { ctx } = this;
    const strategy = await ctx.model.Strategy.findByPk(id);
    if (!strategy) {
      ctx.throw(404, '策略不存在');
    }
    if (adminId !== undefined && strategy.admin_id !== adminId) {
      ctx.throw(403, '无权操作该店铺的策略');
    }

    const transaction = await ctx.model.transaction();
    try {
      await ctx.model.StrategyRule.destroy({
        where: { strategy_id: id },
        transaction,
      });
      await strategy.destroy({ transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = StrategyService;
