'use strict';

const Service = require('egg').Service;

class SysConfigService extends Service {
  /**
   * 根据键名查询参数配置信息
   * @param {string} configKey 参数键名
   * @param adminId
   * @return {Promise<Object>} 参数配置信息
   */
  async getConfigByKey(configKey, adminId) {
    const where = { config_key: configKey };
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    let config = await this.ctx.model.SysConfig.findOne({
      where,
    });

    // 如果是实名奖励代金且不存在，则创建一个默认的
    if (!config && configKey === 'user.money.dai.gift') {
      const createData = {
        config_name: '实名奖励代金',
        config_key: 'user.money.dai.gift',
        config_value: '100',
        remark: '实名认证审核通过后奖励的代金数量（设置值必须为数字）',
      };
      if (adminId !== undefined) {
        createData.admin_id = adminId;
      }
      config = await this.ctx.model.SysConfig.create(createData);
    }

    return config;
  }

  /**
   * 根据键名更新参数配置信息
   * @param {string} configKey 参数键名
   * @param {Object} data 更新的数据
   * @param adminId
   * @return {Promise<boolean>} 是否更新成功
   */
  async updateConfigByKey(configKey, data, adminId) {
    const config = await this.getConfigByKey(configKey, adminId);
    if (!config) {
      return false;
    }
    if (adminId !== undefined && config.admin_id !== adminId) {
      return false;
    }

    await config.update(data);
    return true;
  }
}

module.exports = SysConfigService;
