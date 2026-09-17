'use strict';

const Controller = require('egg').Controller;

class ConfigController extends Controller {
  /**
   * @summary 获取全局基础参数配置
   * @description 获取 shop_id = 0 的全局配置模板
   */
  async getGlobalConfig() {
    const { ctx } = this;

    let config = await ctx.model.ShopConfig.findOne({
      where: { shop_id: 0 },
    });

    if (!config) {
      // 如果不存在，创建一个默认的全局配置
      config = await ctx.model.ShopConfig.create({
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
        invite_new_user_reward: 0.00,
      });
    }

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: config,
    };
  }

  /**
   * @summary 设置全局基础参数配置
   * @description 更新 shop_id = 0 的全局配置模板
   */
  async updateGlobalConfig() {
    const { ctx } = this;
    const payload = ctx.request.body;

    let config = await ctx.model.ShopConfig.findOne({
      where: { shop_id: 0 },
    });

    if (!config) {
      config = await ctx.model.ShopConfig.create({
        shop_id: 0,
        ...payload,
      });
    } else {
      await config.update(payload);
    }

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: config,
    };
  }

  /**
   * @summary 给指定店铺绑定更新基础参数接口
   * @description 更新指定 shop_id 的配置
   */
  async updateShopConfig() {
    const { ctx } = this;
    const { shop_id } = ctx.params;
    const payload = ctx.request.body;

    let config = await ctx.model.ShopConfig.findOne({
      where: { shop_id: Number(shop_id) },
    });

    if (!config) {
      // 如果不存在，从全局模板复制一份并应用更新
      const globalConfig = await ctx.model.ShopConfig.findOne({ where: { shop_id: 0 } });
      const baseData = globalConfig ? globalConfig.toJSON() : {};
      delete baseData.config_id;
      baseData.shop_id = Number(shop_id);

      config = await ctx.model.ShopConfig.create({
        ...baseData,
        ...payload,
      });
    } else {
      await config.update(payload);
    }

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: config,
    };
  }

  /**
   * @summary 获取指定店铺配置 (旧接口兼容)
   */
  async getStoreConfig() {
    const { ctx } = this;
    const { id } = ctx.params; // 这里 id 可能是 admin_id，需要兼容逻辑

    // 如果 id 是商家 ID，我们需要找到对应的 shop_id
    const merchant = await ctx.model.SysUser.findOne({
      where: { user_id: id, user_type: 2, is_deleted: 0 },
    });

    const shop_id = merchant ? merchant.shop_id : id;

    let config = await ctx.model.ShopConfig.findOne({
      where: { shop_id },
    });

    if (!config) {
      // 尝试从全局模板创建
      const globalConfig = await ctx.model.ShopConfig.findOne({ where: { shop_id: 0 } });
      const baseData = globalConfig ? globalConfig.toJSON() : {};
      delete baseData.config_id;
      baseData.shop_id = shop_id;
      config = await ctx.model.ShopConfig.create(baseData);
    }

    // 为了兼容旧前端格式，进行平坦化处理 (如果需要)
    // 这里直接返回 config 对象，如果前端有特定要求再调整
    ctx.body = {
      code: 200,
      message: 'success',
      data: config,
    };
  }

  /**
   * @summary 更新指定店铺配置 (旧接口兼容)
   */
  async updateStoreConfig() {
    const { ctx } = this;
    const { id } = ctx.params;
    const payload = ctx.request.body;

    const merchant = await ctx.model.SysUser.findOne({
      where: { user_id: id, user_type: 2, is_deleted: 0 },
    });

    const shop_id = merchant ? merchant.shop_id : id;

    let config = await ctx.model.ShopConfig.findOne({
      where: { shop_id },
    });

    if (!config) {
      const globalConfig = await ctx.model.ShopConfig.findOne({ where: { shop_id: 0 } });
      const baseData = globalConfig ? globalConfig.toJSON() : {};
      delete baseData.config_id;
      baseData.shop_id = shop_id;
      config = await ctx.model.ShopConfig.create({
        ...baseData,
        ...payload,
      });
    } else {
      await config.update(payload);
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: config,
    };
  }
}

module.exports = ConfigController;
