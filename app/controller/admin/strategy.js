'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-策略管理
 * 管理端策略列表控制器
 */
class AdminStrategyController extends Controller {
  /**
   * @summary 获取策略列表
   * @description 管理端查询策略列表，支持按关键词、类型、状态筛选
   * @router get /api/admin/strategies
   * @request header string Authorization Bearer admin token
   * @request query string keyword 策略名关键词
   * @request query integer type 类型：0默认 1自定义
   * @request query integer status 状态：0启用 1禁用
   * @request query integer page 页码 默认 1
   * @request query integer page_size 每页数量 默认 10
   * @response 200 ApiResponse 策略列表
   */
  async index() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;
    const result = await service.strategy.adminList(ctx.query, adminId);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 获取策略详情
   * @description 管理端查询指定策略详情，包含策略规则 list
   * @router get /api/admin/strategies/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 策略ID
   * @response 200 ApiResponse 策略详情
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.strategy.adminShow(id, adminId);
    if (!result) {
      ctx.throw(404, '策略不存在或无权访问');
    }

    const strategy = result.toJSON ? result.toJSON() : result;
    let rules = await service.strategy.adminRuleList(id);

    // 如果规则项为空但任务单数大于 0，自动补齐规则项
    if (rules.length === 0 && Number(strategy.task_count) > 0) {
      await service.strategy.generateRules(strategy);
      rules = await service.strategy.adminRuleList(id);
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        ...strategy,
        list: rules.map(rule => this.formatRule(rule)),
      },
    };
  }

  /**
   * @summary 获取用户当前策略
   * @description 获取某个用户的绑定策略
   * @router get /api/admin/getUserPolicy
   * @request header string Authorization Bearer admin token
   * @request query string *userId 用户ID
   * @response 200 ApiResponse 策略详情
   */
  async getUserPolicy() {
    const { ctx, service } = this;
    const { userId } = ctx.query;

    if (!userId) {
      ctx.throw(422, '用户ID不能为空');
    }

    const user = await service.user.findUserByCodeOrId(userId);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    let strategyId = user.strategy_id;
    if (!strategyId) {
      const defaultStrategy = await ctx.model.Strategy.findOne({ where: { type: 0 } });
      strategyId = defaultStrategy ? defaultStrategy.id : 0;
    }

    if (!strategyId) {
      ctx.body = {
        code: 200,
        message: '未绑定策略',
        data: null,
      };
      return;
    }

    const result = await service.strategy.adminShow(strategyId);
    if (!result) {
      ctx.body = {
        code: 200,
        message: '策略不存在',
        data: null,
      };
      return;
    }

    const strategy = result.toJSON ? result.toJSON() : result;
    let rules = await service.strategy.adminRuleList(strategyId);

    if (rules.length === 0 && Number(strategy.task_count) > 0) {
      await service.strategy.generateRules(strategy);
      rules = await service.strategy.adminRuleList(strategyId);
    }

    // 查询该用户今日已完成的任务数，以确定哪些规则已被触发或完成
    const dayjs = require('dayjs');
    const todayStr = dayjs().format('YYYY-MM-DD');
    const overNum = await ctx.model.UserTask.count({
      where: { user_id: user.id, status: 1, task_date: todayStr },
    });

    const formattedRules = rules.map(rule => {
      const r = this.formatRule(rule);
      // 根据用户完成任务数更新 isTrriger 状态
      // num 从 1 开始。如果 num <= overNum，说明任务已完成
      // 如果 num == overNum + 1，且用户开启了任务，说明当前任务正在触发/进行中
      if (r.num <= overNum) {
        r.isTrriger = '1';
      } else if (r.num === overNum + 1 && user.is_task_started) {
        r.isTrriger = '1';
      } else {
        r.isTrriger = '0';
      }
      return r;
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        ...strategy,
        list: formattedRules,
      },
    };
  }

  /**
   * @summary 绑定用户策略
   * @description 管理端绑定用户策略
   * @router post /api/admin/bindUserPolicy
   * @request header string Authorization Bearer admin token
   * @request body string *userId 用户ID
   * @request body integer *strategyId 策略ID
   * @response 200 ApiResponse 绑定成功
   */
  async bindUserPolicy() {
    const { ctx, service } = this;
    const { userId, strategyId } = ctx.request.body;

    if (!userId || strategyId === undefined) {
      ctx.throw(422, '用户ID和策略ID不能为空');
    }

    const user = await service.user.findUserByCodeOrId(userId);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    const strategy = await service.strategy.adminShow(strategyId);
    if (!strategy) {
      ctx.throw(404, '策略不存在');
    }

    await user.update({ strategy_id: strategyId, is_task_started: false });

    ctx.body = {
      code: 200,
      message: '绑定成功',
      data: null,
    };
  }

  /**
   * @summary 开启用户任务
   * @description 管理端开启用户任务
   * @router post /api/admin/startUserTask
   * @request header string Authorization Bearer admin token
   * @request body string *userId 用户ID
   * @response 200 ApiResponse 开启成功
   */
  async startUserTask() {
    const { ctx, service } = this;
    const { userId } = ctx.request.body;

    if (!userId) {
      ctx.throw(422, '用户ID不能为空');
    }

    const user = await service.user.findUserByCodeOrId(userId);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    const strategyId = user.strategy_id;
    if (!strategyId) {
      ctx.throw(400, '用户未绑定策略，无法开启任务');
    }

    const strategy = await service.strategy.adminShow(strategyId);
    if (!strategy || strategy.type === 0) {
      ctx.throw(400, '默认策略无法开启任务，请先绑定非默认状态的策略');
    }

    await user.update({ is_task_started: true });

    ctx.body = {
      code: 200,
      message: '开启成功',
      data: null,
    };
  }

  /**
   * @summary 获取用户任务是否开启
   * @description 管理端获取用户任务是否开启
   * @router get /api/admin/getUserTaskStatus
   * @request header string Authorization Bearer admin token
   * @request query string *userId 用户ID
   * @response 200 ApiResponse 任务开启状态
   */
  async getUserTaskStatus() {
    const { ctx, service } = this;
    const { userId } = ctx.query;

    if (!userId) {
      ctx.throw(422, '用户ID不能为空');
    }

    const user = await service.user.findUserByCodeOrId(userId);
    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        is_task_started: user.is_task_started,
      },
    };
  }

  /**
   * 格式化规则项为前端需要的 camelCase 字段
   * @param {Object} rule 规则数据库对象
   * @return {Object} 格式化后的规则
   */
  formatRule(rule) {
    const r = rule.toJSON ? rule.toJSON() : rule;
    return {
      createBy: null,
      createTime: null,
      updateBy: null,
      updateTime: null,
      remark: r.remark || null,
      ids: null,
      googleCode: null,
      ruleModelId: r.rule_model_id,
      num: r.num,
      policyId: r.strategy_id,
      waresId: r.wares_id,
      addMoney: Number(r.add_money) || 0,
      backRate: Number(r.back_rate) || 0,
      backMoney: Number(r.back_money) || 0,
      adminSetWaresName: r.admin_set_wares_name || null,
      adminSetPrice: Number(r.admin_set_price) || 0,
      ruleType: r.rule_type != null ? Number(r.rule_type) : 0,
      matchType: r.match_type != null ? Number(r.match_type) : 0,
      isTrriger: r.is_trigger != null ? String(r.is_trigger) : '0',
      isRun: r.is_run != null ? String(r.is_run) : '0',
      status: r.status,
      cTime: this.formatDateTime(r.created_at),
      uTime: this.formatDateTime(r.updated_at),
    };
  }

  /**
   * 格式化日期时间为 yyyy-MM-dd HH:mm:ss
   * @param {Date|string} date 日期
   * @return {string} 格式化字符串
   */
  formatDateTime(date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const pad = n => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /**
   * @summary 更新策略规则项
   * @description 管理端更新指定策略下的规则项
   * @router put /api/admin/strategies/:id/rules/:ruleModelId
   * @request header string Authorization Bearer admin token
   * @request path integer *id 策略ID
   * @request path integer *ruleModelId 规则模型ID
   * @request body StrategyRuleRequest *body 规则信息
   * @response 200 ApiResponse 更新成功
   */
  async updateRule() {
    const { ctx, service } = this;
    const { id, ruleModelId } = ctx.params;

    const rule = await service.strategy.adminUpdateRule(id, ruleModelId, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: this.formatRule(rule),
    };
  }

  /**
   * @summary 创建策略
   * @description 管理端新增策略
   * @router post /api/admin/strategies
   * @request header string Authorization Bearer admin token
   * @request body StrategyRequest *body 策略信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    if (!adminId) {
      ctx.throw(401, '未授权或无法获取店铺信息');
    }

    const result = await service.strategy.adminCreate(ctx.request.body, adminId);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: result,
    };
  }

  /**
   * @summary 更新策略
   * @description 管理端更新指定策略
   * @router put /api/admin/strategies/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 策略ID
   * @request body StrategyRequest *body 策略信息
   * @response 200 ApiResponse 更新成功
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    const result = await service.strategy.adminUpdate(id, ctx.request.body, adminId);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: result,
    };
  }

  /**
   * @summary 删除策略
   * @description 管理端删除指定策略（物理删除）
   * @router delete /api/admin/strategies/:id
   * @request header string Authorization Bearer admin token
   * @request path integer *id 策略ID
   * @response 200 ApiResponse 删除成功
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;

    await service.strategy.adminDestroy(id, adminId);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = AdminStrategyController;
