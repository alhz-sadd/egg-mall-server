'use strict';

const Controller = require('egg').Controller;

class TelegramBotController extends Controller {
  /**
   * @summary 获取TG机器人列表
   * @description 查询已配置TG机器人的店铺（或全局）配置
   */
  async index() {
    const { ctx } = this;
    const { page = 1, pageSize = 10, shop_id } = ctx.query;

    const where = {
      telegram_bot_token: {
        [ctx.app.Sequelize.Op.not]: null,
        [ctx.app.Sequelize.Op.ne]: '',
      },
    };

    if (shop_id !== undefined && shop_id !== '') {
      where.shop_id = Number(shop_id);
    }

    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const { count, rows } = await ctx.model.ShopConfig.findAndCountAll({
      where,
      include: [
        {
          model: ctx.model.Shop,
          as: 'shop',
          attributes: [ 'shop_id', 'shop_name' ],
        },
      ],
      order: [[ 'shop_id', 'ASC' ]],
      offset,
      limit,
    });

    const list = rows.map(item => {
      return {
        id: item.shop_id, // 使用 shop_id 作为唯一标识返回给前端进行操作
        shop_id: item.shop_id,
        shop_name: item.shop_id === 0 ? '平台全局配置' : (item.shop ? item.shop.shop_name : `未知店铺(${item.shop_id})`),
        telegram_bot_token: item.telegram_bot_token,
        telegram_chat_id: item.telegram_chat_id,
        update_time: item.update_time,
      };
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        list,
        pagination: {
          total: count,
          page: Number(page),
          page_size: Number(pageSize),
          total_pages: Math.ceil(count / limit),
        },
      },
    };
  }

  /**
   * @summary 新增TG机器人配置
   * @description 给指定的 shop_id 配置TG机器人
   */
  async create() {
    const { ctx } = this;
    const { shop_id, telegram_bot_token, telegram_chat_id } = ctx.request.body;

    ctx.validate({
      shop_id: { type: 'number', required: true },
      telegram_bot_token: { type: 'string', required: true },
      telegram_chat_id: { type: 'string', required: true },
    }, ctx.request.body);

    let config = await ctx.model.ShopConfig.findOne({
      where: { shop_id: Number(shop_id) },
    });

    if (!config) {
      // 从全局模板克隆基础数据，避免缺少必填项报错
      const globalConfig = await ctx.model.ShopConfig.findOne({ where: { shop_id: 0 } });
      const baseData = globalConfig ? globalConfig.toJSON() : {};
      delete baseData.config_id;
      baseData.shop_id = Number(shop_id);
      baseData.telegram_bot_token = telegram_bot_token;
      baseData.telegram_chat_id = telegram_chat_id;

      config = await ctx.model.ShopConfig.create(baseData);
    } else {
      if (config.telegram_bot_token) {
        ctx.throw(422, '该店铺已经配置过机器人，请使用编辑功能');
      }
      await config.update({
        telegram_bot_token,
        telegram_chat_id,
      });
    }

    ctx.body = {
      code: 200,
      message: '新增成功',
      data: config,
    };
  }

  /**
   * @summary 更新TG机器人配置
   * @description 这里的 id 实际上是 shop_id
   */
  async update() {
    const { ctx } = this;
    const id = Number(ctx.params.id);
    const { telegram_bot_token, telegram_chat_id } = ctx.request.body;

    ctx.validate({
      telegram_bot_token: { type: 'string', required: true },
      telegram_chat_id: { type: 'string', required: true },
    }, ctx.request.body);

    const config = await ctx.model.ShopConfig.findOne({
      where: { shop_id: id },
    });

    if (!config) {
      ctx.throw(404, '该店铺配置不存在');
    }

    await config.update({
      telegram_bot_token,
      telegram_chat_id,
    });

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: config,
    };
  }

  /**
   * @summary 删除TG机器人配置
   * @description 这里的 id 实际上是 shop_id，删除即将字段置空
   */
  async destroy() {
    const { ctx } = this;
    const id = Number(ctx.params.id);

    const config = await ctx.model.ShopConfig.findOne({
      where: { shop_id: id },
    });

    if (!config) {
      ctx.throw(404, '该店铺配置不存在');
    }

    await config.update({
      telegram_bot_token: null,
      telegram_chat_id: null,
    });

    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }
}

module.exports = TelegramBotController;
