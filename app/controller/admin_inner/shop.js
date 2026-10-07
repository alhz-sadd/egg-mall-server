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

    // 5. VIP 等级
    let vips = [];
    if (ctx.model.ShopVipLevel) {
      vips = await ctx.model.ShopVipLevel.findAll({
        where: { shop_id: id, is_enable: 1 },
        order: [[ 'sort', 'ASC' ], [ 'level', 'ASC' ]],
      });
    }

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        ...shop.toJSON(),
        withdraw_data: {
          total_withdraw_amount: Number(total_withdraw_amount),
          total_withdraw_users,
          total_withdraw_count,
        },
        vips,
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
      operate_password: { type: 'string', required: false },
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
  /**
   * 导入全局模板到店铺 (支持分批导入)
   */
  async importTemplates() {
    const { ctx } = this;
    const { shop_id, type } = ctx.request.body;

    ctx.validate({
      shop_id: { type: 'int', required: true, convertType: 'int' },
      type: { type: 'string', required: true }, // 可选值: 'banner', 'rule', 'service', 'all'
    }, ctx.request.body);

    // 校验店铺是否存在
    const shop = await ctx.model.Shop.findOne({
      where: { shop_id, is_deleted: 0 },
    });

    if (!shop) {
      ctx.throw(404, '店铺不存在');
    }

    const adminId = ctx.state.adminInner.adminInnerId;

    // 根据 type 决定导入的内容
    const configTypesToImport = [];
    let importService = false;

    switch (type) {
      case 'banner':
        configTypesToImport.push(1);
        break;
      case 'rule':
        configTypesToImport.push(3);
        break;
      case 'service':
        importService = true;
        break;
      case 'all':
        configTypesToImport.push(1, 3);
        importService = true;
        break;
      default:
        ctx.throw(400, '不支持的模板类型');
    }

    // 1. 导入 H5 配置 (Banner、规则)
    if (configTypesToImport.length > 0) {
      await ctx.service.h5Config.importGlobalConfigs(shop_id, adminId, configTypesToImport);
    }

    // 2. 导入 客服配置
    if (importService) {
      await ctx.service.h5Service.importGlobalServices(shop_id, adminId);
    }

    ctx.body = {
      code: 200,
      message: '导入模板成功',
    };
  }

  /**
   * 删除店铺 (深度级联清理)
   */
  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    const shop = await ctx.model.Shop.findByPk(id);
    if (!shop) {
      ctx.throw(404, '店铺不存在');
    }

    // 调用 Service 执行店铺的深度清理
    await ctx.service.shop.destroy(shop.shop_id);

    ctx.body = {
      code: 200,
      message: '店铺删除成功，已清理相关所有数据',
      data: null,
    };
  }
}

module.exports = ShopController;
