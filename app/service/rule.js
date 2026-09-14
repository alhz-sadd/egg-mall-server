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
   * @return {Object} 规则图片数组
   */
  async get() {
    const { ctx } = this;
    const rule = await ctx.model.SysH5Config.findOne({
      where: { config_type: 3, status: 1, is_deleted: 0 },
    });

    // extra 的解析：如果原本就是对象则直接用，否则尝试 JSON.parse，解析失败兜底为空对象
    let extraData = {};
    if (rule && rule.extra) {
      if (typeof rule.extra === 'string') {
        try {
          extraData = JSON.parse(rule.extra);
        } catch (e) {
          extraData = {};
        }
      } else {
        extraData = rule.extra;
      }
    }

    return {
      images: extraData.images || [],
    };
  }

  /**
   * 管理端获取规则
   * 返回完整规则数据（含状态）
   * @return {Object|Array} 规则数据
   */
  async adminGet() {
    const { ctx } = this;
    const rules = await ctx.model.SysH5Config.findAll({
      where: { config_type: 3, is_deleted: 0 },
      order: [[ 'id', 'DESC' ]],
    });

    // 如果想要前端支持多套规则列表，这里可以直接返回数组。
    // 为了兼容前端如果只想取对象的情况，你可以看前端具体是怎么渲染的。这里我们直接返回包含 extra 解析后的数组。
    return rules.map(rule => {
      let extraData = {};
      if (rule.extra) {
        if (typeof rule.extra === 'string') {
          try { extraData = JSON.parse(rule.extra); } catch (e) {}
        } else {
          extraData = rule.extra;
        }
      }
      return {
        id: rule.id,
        title: rule.title,
        status: rule.status,
        images: extraData.images || [],
        extra: extraData,
      };
    });
  }

  /**
   * 创建/更新规则
   * @param {Object} payload 规则数据
   * @return {Object} 规则数据
   */
  async create(payload) {
    const { ctx } = this;
    const images = this.extractImages(payload);

    // 获取所有存在的规则
    const existList = await ctx.model.SysH5Config.findAll({
      where: { config_type: 3, is_deleted: 0 },
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

    // 开启事务，保证原子性
    const transaction = await ctx.model.transaction();
    try {
      if (currentRule) {
        // 更新当前规则
        const title = payload.title || currentRule.title;
        await currentRule.update({
          title,
          extra: { images },
          status: targetStatus,
        }, { transaction });
      } else {
        // 创建新规则
        currentRule = await ctx.model.SysH5Config.create({
          config_type: 3,
          title: payload.title || '规则管理',
          extra: { images },
          status: targetStatus,
        }, { transaction });
        existList.push(currentRule);
      }

      // 互斥逻辑：如果当前操作的是启用，就把其他所有的规则全部禁用 (status: 0)
      if (targetStatus === 1) {
        const otherIds = existList.map(item => item.id).filter(item_id => item_id !== currentRule.id);
        if (otherIds.length > 0) {
          await ctx.model.SysH5Config.update(
            { status: 0 },
            { where: { id: otherIds }, transaction },
          );
        }
      }

      await transaction.commit();
      return { images: currentRule.extra.images, status: currentRule.status };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 更新规则
   * 若不存在则自动创建
   * @param {Object} payload 规则数据
   * @return {Object} 规则数据
   */
  async update(payload) {
    return await this.create(payload);
  }

  /**
   * 单独更新规则状态
   * @param {Number} id 规则ID
   * @param {Number} status 状态值 (0或1)
   */
  async updateStatus(id, status) {
    const { ctx } = this;
    const targetStatus = Number(status);

    const currentRule = await ctx.model.SysH5Config.findOne({
      where: { id, config_type: 3, is_deleted: 0 },
    });

    if (!currentRule) {
      ctx.throw(404, '要操作的规则模板不存在');
    }

    const transaction = await ctx.model.transaction();
    try {
      // 1. 更新当前目标状态
      await currentRule.update({ status: targetStatus }, { transaction });

      // 2. 如果是启用操作，强制把其他的都停用
      if (targetStatus === 1) {
        await ctx.model.SysH5Config.update(
          { status: 0 },
          {
            where: {
              config_type: 3,
              is_deleted: 0,
              id: { [ctx.app.Sequelize.Op.ne]: id },
            },
            transaction,
          },
        );
      }

      await transaction.commit();
      return { id, status: targetStatus };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 删除规则
   */
  async destroy() {
    const { ctx } = this;
    const id = ctx.params.id || ctx.request.body.id;

    const where = { config_type: 3, is_deleted: 0 };
    if (id) {
      where.id = id;
    }

    const rule = await ctx.model.SysH5Config.findOne({ where });
    if (!rule) {
      ctx.throw(404, '规则不存在');
    }

    await rule.update({ status: 0, is_deleted: 1 });
  }

  /**
   * 提取图片数组
   * @param {Object} payload 请求数据
   * @return {Array<string>} 图片地址数组
   */
  extractImages(payload) {
    const { ctx } = this;
    if (payload.images !== undefined) {
      ctx.assert(Array.isArray(payload.images), 422, 'images 必须是数组');
      return payload.images;
    }
    return [];
  }
}

module.exports = RuleService;
