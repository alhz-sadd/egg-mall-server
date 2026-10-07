'use strict';

const Service = require('egg').Service;

/**
 * 规则服务层
 * 全站只有一条规则记录
 */
class RuleService extends Service {
  /**
   * 获取规则
   * 仅返回那套处于启用状态的规则模板里的图片数组
   * @param {Number} shopId 店铺ID，如果不传则查询全局配置
   * @return {Object} 规则图片数组
   */
  async get(shopId = 0) {
    const { ctx } = this;
    const rule = await ctx.model.SysH5Config.findOne({
      where: { config_type: 3, status: 1, is_deleted: 0, shop_id: shopId },
    });

    return {
      content: rule ? rule.content : '',
    };
  }

  /**
   * 管理端获取规则
   * 返回完整规则数据（含状态）
   * @param {Number} shopId 店铺ID，如果不传则查询全局配置
   * @return {Object|Array} 规则数据
   */
  async adminGet(shopId) {
    const { ctx } = this;
    const where = { config_type: 3, is_deleted: 0 };
    if (shopId !== undefined) {
      where.shop_id = shopId;
    } else {
      // 默认查询全局模板
      where.shop_id = 0;
    }
    const rules = await ctx.model.SysH5Config.findAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
    });

    return rules.map(rule => {
      return {
        id: rule.id,
        title: rule.title,
        sort: rule.sort,
        status: rule.status,
        content: rule.content || '',
      };
    });
  }

  /**
   * 创建/更新规则
   * @param {Object} payload 规则数据
   * @param {Number} shopId 店铺ID，默认0（全局）
   * @return {Object} 规则数据
   */
  async create(payload, shopId = 0) {
    const { ctx } = this;
    const content = payload.content || '';
    const sort = payload.sort !== undefined ? Number(payload.sort) : 0;

    // 获取所有存在的规则
    const existList = await ctx.model.SysH5Config.findAll({
      where: { config_type: 3, shop_id: shopId, is_deleted: 0 },
    });

    let currentRule = null;
    const id = payload.id;

    if (id) {
      currentRule = existList.find(item => item.id === Number(id));
      if (!currentRule) {
        ctx.throw(404, '要编辑的规则模板不存在');
      }
    }

    // 判断即将保存的这条规则状态是不是启用 (1)
    const targetStatus = payload.status !== undefined ? Number(payload.status) : 1;

    // 如果是店铺规则，只能有一条规则启用；如果是平台模板（shopId=0），则允许多个启用以供选择
    if (targetStatus === 1 && shopId !== 0) {
      for (const rule of existList) {
        if (rule.status === 1 && (!currentRule || rule.id !== currentRule.id)) {
          await rule.update({ status: 0 });
        }
      }
    }

    if (currentRule) {
      // 更新当前规则
      const title = payload.title || currentRule.title;
      await currentRule.update({
        title,
        sort,
        content,
        status: targetStatus,
      });

      // 如果是全局模板 (shop_id = 0) 被更新，同步到所有绑定了该模板的店铺
      if (shopId === 0 && currentRule.config_type === 3) {
        await ctx.model.SysH5Config.update(
          {
            title,
            sort,
            content,
            status: targetStatus,
            update_user_id: ctx.state.adminInner ? ctx.state.adminInner.adminInnerId : null,
            update_time: new Date(),
          },
          { where: { source_template_id: currentRule.id, config_type: 3, is_deleted: 0 } }
        );
      }

    } else {
      // 创建新规则
      currentRule = await ctx.model.SysH5Config.create({
        config_type: 3,
        title: payload.title || '规则管理',
        sort,
        content,
        status: targetStatus,
        shop_id: shopId,
        source_template_id: shopId === 0 ? 0 : (payload.source_template_id || 0), // 新建时，如果不是全局模板，可指定来源
      });
      existList.push(currentRule);
    }

    return { content: currentRule.content, status: currentRule.status, sort: currentRule.sort };
  }

  /**
   * 更新规则
   * 若不存在则自动创建
   * @param {Object} payload 规则数据
   * @param {Number} shopId 店铺ID
   * @return {Object} 规则数据
   */
  async update(payload, shopId = 0) {
    return await this.create(payload, shopId);
  }

  /**
   * 单独更新规则状态
   * @param {Number} id 规则ID
   * @param {Number} status 状态值 (0或1)
   * @param {Number} shopId 店铺ID
   */
  async updateStatus(id, status, shopId = 0) {
    const { ctx } = this;
    const targetStatus = Number(status);

    const currentRule = await ctx.model.SysH5Config.findOne({
      where: { id, config_type: 3, shop_id: shopId, is_deleted: 0 },
    });

    if (!currentRule) {
      ctx.throw(404, '要操作的规则模板不存在');
    }

    // 如果是店铺规则，只能有一条规则启用；如果是平台模板（shopId=0），则允许多个启用以供选择
    if (targetStatus === 1 && shopId !== 0) {
      await ctx.model.SysH5Config.update(
        { status: 0 },
        { where: { config_type: 3, shop_id: shopId, is_deleted: 0 } },
      );
    }

    await currentRule.update({ status: targetStatus });

    return { id, status: targetStatus };
  }

  /**
   * 删除规则
   * @param {Number} id 规则ID
   * @param {Number} shopId 店铺ID
   */
  async destroy(id, shopId = 0) {
    const { ctx } = this;
    const ruleId = id || ctx.params.id || ctx.request.body.id;

    const where = { config_type: 3, shop_id: shopId, is_deleted: 0 };
    if (ruleId) {
      where.id = ruleId;
    }

    const rule = await ctx.model.SysH5Config.findOne({ where });
    if (!rule) {
      ctx.throw(404, '规则不存在');
    }

    await rule.destroy();
  }
  /**
   * 绑定平台规则模板到店铺
   * @param {Number} templateId 平台模板ID
   * @param {Number} shopId 店铺ID
   */
  async bindTemplate(templateId, shopId) {
    const { ctx } = this;
    if (!shopId) {
      ctx.throw(400, '必须提供 shopId');
    }

    // 获取平台模板
    const template = await ctx.model.SysH5Config.findOne({
      where: { id: templateId, config_type: 3, shop_id: 0, is_deleted: 0 },
    });

    if (!template) {
      ctx.throw(404, '指定的平台模板不存在');
    }

    // 先将当前店铺已有的启用规则禁用（一家店铺只能绑定一条启用规则）
    await ctx.model.SysH5Config.update(
      { status: 0 },
      { where: { config_type: 3, shop_id: shopId, status: 1, is_deleted: 0 } },
    );

    // 将模板数据复制一条作为店铺的绑定规则（启用状态）
    const newRule = await ctx.model.SysH5Config.create({
      config_type: 3,
      title: template.title,
      sort: template.sort,
      content: template.content,
      status: 1,
      shop_id: shopId,
      source_template_id: templateId, // 记录来源模板ID
    });

    return newRule;
  }
}

module.exports = RuleService;
