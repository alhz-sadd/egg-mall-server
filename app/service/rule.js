'use strict';

const Service = require('egg').Service;

/**
 * 规则服务层
 * 全站只有一条规则记录
 */
class RuleService extends Service {
  /**
   * 获取规则
   * 仅返回启用状态的图片数组
   * @return {Object} 规则图片数组
   */
  async get() {
    const { ctx } = this;
    const rule = await ctx.model.Rule.findOne({ where: { status: 1 } });
    return {
      images: rule ? rule.images : [],
    };
  }

  /**
   * 管理端获取规则
   * 返回完整规则数据（含状态）
   * @return {Object} 规则数据
   */
  async adminGet() {
    const { ctx } = this;
    const rule = await ctx.model.Rule.findOne();
    if (!rule) {
      ctx.throw(404, '规则不存在');
    }
    return rule;
  }

  /**
   * 创建规则
   * 若已存在则直接更新
   * @param {Object} payload 规则数据
   * @return {Object} 规则数据
   */
  async create(payload) {
    const { ctx } = this;
    const images = this.extractImages(payload);

    const exist = await ctx.model.Rule.findOne({ where: { status: 1 } });
    if (exist) {
      await exist.update({ images });
      return { images: exist.images };
    }

    const rule = await ctx.model.Rule.create({ images });
    return { images: rule.images };
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
   * 删除规则（软删除，清空图片）
   */
  async destroy() {
    const { ctx } = this;
    const rule = await ctx.model.Rule.findOne({ where: { status: 1 } });
    if (!rule) {
      ctx.throw(404, '规则不存在');
    }

    await rule.update({ status: 0 });
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
