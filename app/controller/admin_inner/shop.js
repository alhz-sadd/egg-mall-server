'use strict';

const Controller = require('egg').Controller;

class ShopController extends Controller {
  /**
   * 获取店铺详情
   */
  async show() {
    const { ctx } = this;
    const { id } = ctx.params;

    const shop = await ctx.model.Shop.findOne({
      where: { shop_id: id, is_deleted: 0 },
    });

    if (!shop) {
      ctx.throw(404, '店铺不存在');
    }

    // 统计数据 (按规范补充)
    // 1. 注册统计
    let total_register_count = 0;
    if (ctx.model.CustomerRelation) {
      total_register_count = await ctx.model.CustomerRelation.count({
        where: { shop_id: id },
      });
    }

    // 2. 充值统计
    let total_recharge_amount = 0;
    let total_recharge_users = 0;
    let total_recharge_count = 0;
    if (ctx.model.UserRecharge) {
      const [ amountSum, userCount, count ] = await Promise.all([
        ctx.model.UserRecharge.sum('amount', {
          where: { shop_id: id, status: 2 },
        }),
        ctx.model.UserRecharge.count({
          distinct: true,
          col: 'user_id',
          where: { shop_id: id, status: 2 },
        }),
        ctx.model.UserRecharge.count({
          where: { shop_id: id, status: 2 },
        }),
      ]);
      total_recharge_amount = amountSum || 0;
      total_recharge_users = userCount || 0;
      total_recharge_count = count || 0;
    }

    // 3. 提现统计
    let total_withdraw_amount = 0;
    let total_withdraw_users = 0;
    let total_withdraw_count = 0;
    if (ctx.model.UserWithdraw) {
      const [ amountSum, userCount, count ] = await Promise.all([
        ctx.model.UserWithdraw.sum('amount', {
          where: { shop_id: id, status: 2 },
        }),
        ctx.model.UserWithdraw.count({
          distinct: true,
          col: 'user_id',
          where: { shop_id: id, status: 2 },
        }),
        ctx.model.UserWithdraw.count({
          where: { shop_id: id, status: 2 },
        }),
      ]);
      total_withdraw_amount = amountSum || 0;
      total_withdraw_users = userCount || 0;
      total_withdraw_count = count || 0;
    }

    // 4. 支付通道
    let pay_channels = [];
    if (ctx.model.ShopPayChannel) {
      pay_channels = await ctx.model.ShopPayChannel.findAll({
        where: { shop_id: id, is_enable: 1 },
        raw: true,
      });
    }

    // 5. VIP 等级
    let vips = [];
    if (ctx.model.ShopVipLevel) {
      vips = await ctx.model.ShopVipLevel.findAll({
        where: { shop_id: id, is_enable: 1 },
        order: [[ 'sort', 'ASC' ], [ 'level', 'ASC' ]],
      });
    }

    // 6. 店铺配置
    let config = null;
    if (ctx.model.ShopConfig) {
      config = await ctx.model.ShopConfig.findOne({
        where: { shop_id: id },
      });
    }

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        ...shop.toJSON(),
        register_data: {
          total_register_count,
          yesterday_register_count: 0, // 占位，后续可扩展
          today_register_count: 0,
        },
        recharge_data: {
          total_recharge_amount: Number(total_recharge_amount),
          total_recharge_users,
          total_recharge_count,
        },
        withdraw_data: {
          total_withdraw_amount: Number(total_withdraw_amount),
          total_withdraw_users,
          total_withdraw_count,
        },
        pay_channels,
        vips,
        config,
      },
    };
  }

  /**
   * 获取所有启用店铺 (下拉框)
   */
  async all() {
    const { ctx } = this;
    const list = await ctx.model.Shop.findAll({
      where: { status: 1, is_deleted: 0 },
      attributes: [ 'shop_id', 'shop_name', 'shop_no' ],
      order: [[ 'shop_id', 'DESC' ]],
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: list,
    };
  }

  /**
   * 获取店铺分页列表
   */
  async index() {
    const { ctx } = this;
    const { shop_name, shop_no, status, contact_phone, page = 1, page_size = 10 } = ctx.query;

    const where = { is_deleted: 0 };
    if (shop_name) where.shop_name = { [this.app.Sequelize.Op.like]: `%${shop_name}%` };
    if (shop_no) where.shop_no = shop_no;
    if (status !== undefined && status !== '') where.status = Number(status);
    if (contact_phone) where.contact_phone = contact_phone;

    const { count, rows } = await ctx.model.Shop.findAndCountAll({
      where,
      offset: (Number(page) - 1) * Number(page_size),
      limit: Number(page_size),
      order: [[ 'shop_id', 'DESC' ]],
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        list: rows,
      },
    };
  }

  /**
   * 获取店铺业务配置
   */
  async getSetting() {
    const { ctx } = this;
    const { shop_id } = ctx.params;

    let setting = await ctx.model.ShopConfig.findOne({
      where: { shop_id },
    });

    if (!setting) {
      // 如果不存在，创建一个默认的
      setting = await ctx.model.ShopConfig.create({
        shop_id,
      });
    }

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: setting,
    };
  }

  /**
   * 修改店铺业务配置
   */
  async updateSetting() {
    const { ctx } = this;
    const { shop_id } = ctx.params;
    const payload = ctx.request.body;

    ctx.validate({
      real_name_reward: { type: 'number', required: false },
      invite_new_user_reward: { type: 'number', required: false },
      order_pay_timeout_switch: { type: 'int', required: false },
      order_pay_timeout: { type: 'int', required: false },
      withdraw_min_amount: { type: 'number', required: false },
      withdraw_max_amount: { type: 'number', required: false },
      withdraw_fee_type: { type: 'int', required: false },
      withdraw_fee_value: { type: 'number', required: false },
      withdraw_first_need_task: { type: 'int', required: false },
      withdraw_first_need_identity: { type: 'int', required: false },
      recharge_fee_rate: { type: 'number', required: false },
    }, payload);

    if (payload.real_name_reward !== undefined && payload.real_name_reward < 0) {
      payload.real_name_reward = 0;
    }
    if (payload.invite_new_user_reward !== undefined && payload.invite_new_user_reward < 0) {
      payload.invite_new_user_reward = 0;
    }

    const setting = await ctx.model.ShopConfig.findOne({
      where: { shop_id },
    });

    if (!setting) {
      ctx.throw(404, '店铺配置不存在');
    }

    await setting.update(payload);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: setting,
    };
  }
}

module.exports = ShopController;
