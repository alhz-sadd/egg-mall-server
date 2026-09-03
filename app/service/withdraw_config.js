'use strict';

const Service = require('egg').Service;

/**
 * 提现参数配置服务层
 * 全站只有一条配置记录
 */
class WithdrawConfigService extends Service {
  /**
   * 获取提现参数配置
   * @param adminId
   * @return {Object} 配置数据
   */
  async get(adminId) {
    const { ctx } = this;
    const where = { status: 1 };
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    let config = await ctx.model.WithdrawConfig.findOne({ where });

    // 如果不存在配置，创建默认配置
    if (!config) {
      config = await this.createDefault(adminId);
    }

    return {
      min_money: String(config.min_money),
      need_task: config.need_task ? 'true' : 'false',
      sx_rate: config.sx_rate,
    };
  }

  /**
   * 管理端获取完整配置（含状态）
   * @param adminId
   * @return {Object} 完整配置数据
   */
  async adminGet(adminId) {
    const { ctx } = this;
    const where = {};
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    let config = await ctx.model.WithdrawConfig.findOne({ where });

    // 如果不存在配置，创建默认配置
    if (!config) {
      config = await this.createDefault(adminId);
    }

    return {
      id: config.id,
      min_money: String(config.min_money),
      need_task: config.need_task ? 'true' : 'false',
      sx_rate: config.sx_rate,
      status: config.status,
    };
  }

  /**
   * 创建默认配置
   * @param adminId
   * @return {Object} 创建的配置
   */
  async createDefault(adminId) {
    const { ctx } = this;
    const configData = {
      min_money: 10.00,
      need_task: true,
      sx_rate: '0.03',
      status: 1,
    };
    if (adminId !== undefined) {
      configData.admin_id = adminId;
    }
    return await ctx.model.WithdrawConfig.create(configData);
  }

  /**
   * 更新提现参数配置
   * @param {Object} payload 更新数据
   * @param adminId
   * @return {Object} 更新后的配置
   */
  async update(payload, adminId) {
    const { ctx } = this;
    const { min_money, need_task, sx_rate } = payload;

    // 验证参数
    ctx.assert(min_money !== undefined && min_money !== null, 422, '提现最小值不能为空');
    ctx.assert(need_task !== undefined && need_task !== null, 422, '是否需要完成任务不能为空');
    ctx.assert(sx_rate !== undefined && sx_rate !== null, 422, '手续费比例不能为空');

    // 验证提现最小值
    const minMoney = Number(min_money);
    ctx.assert(!isNaN(minMoney) && minMoney >= 0, 422, '提现最小值必须是非负数');

    // 验证手续费比例
    const rate = Number(sx_rate);
    ctx.assert(!isNaN(rate) && rate >= 0 && rate <= 1, 422, '手续费比例必须在0-1之间');

    const where = {};
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    // 查找现有配置
    let config = await ctx.model.WithdrawConfig.findOne({ where });

    const updateData = {
      min_money: minMoney,
      need_task: String(need_task).toLowerCase() === 'true',
      sx_rate: String(sx_rate),
    };

    if (config) {
      await config.update(updateData);
      config = await ctx.model.WithdrawConfig.findByPk(config.id);
    } else {
      if (adminId !== undefined) {
        updateData.admin_id = adminId;
      }
      config = await ctx.model.WithdrawConfig.create({
        ...updateData,
        status: 1,
      });
    }

    return {
      id: config.id,
      min_money: String(config.min_money),
      need_task: config.need_task ? 'true' : 'false',
      sx_rate: config.sx_rate,
      status: config.status,
    };
  }
}

module.exports = WithdrawConfigService;
