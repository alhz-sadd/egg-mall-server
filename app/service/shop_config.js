'use strict';

const Service = require('egg').Service;

class ShopConfigService extends Service {
  /**
   * 新建店铺时，从全局模板复制基础参数配置
   * @param {number} new_shop_id 新店铺ID
   * @param {Object} transaction 事务对象
   */
  async copyTemplateToShop(new_shop_id, transaction) {
    const { ctx } = this;

    // 获取全局模板 (shop_id = 0)
    let globalConfig = await ctx.model.ShopConfig.findOne({
      where: { shop_id: 0 },
      transaction,
    });

    // 如果全局模板不存在，先创建一个默认的
    if (!globalConfig) {
      globalConfig = await ctx.model.ShopConfig.create({
        shop_id: 0,
        real_name_reward: 0.00,
        order_pay_timeout_switch: 0,
        order_pay_timeout: 1800,
        withdraw_min_amount: 20.00,
        withdraw_max_amount: 99999.00,
        withdraw_fee_type: 2,
        withdraw_fee_value: 0.03,
        recharge_fee_rate: 0.00,
        withdraw_first_need_task: 0,
        withdraw_first_need_identity: 0,
      }, { transaction });
    }

    const baseData = globalConfig.toJSON();
    delete baseData.config_id;
    baseData.shop_id = new_shop_id;

    await ctx.model.ShopConfig.create(baseData, { transaction });
  }
}

module.exports = ShopConfigService;
