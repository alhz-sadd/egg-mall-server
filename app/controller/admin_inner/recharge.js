'use strict';

const Controller = require('egg').Controller;

class AdminInnerRechargeController extends Controller {
  /**
   * 获取充值列表 (A端全局)
   */
  async index() {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    const { page = 1, page_size = 10, order_no, status, user_id, start_time, end_time, shop_id } = ctx.query;

    const where = {};

    if (shop_id) {
      where.shop_id = shop_id;
    }
    if (order_no) {
      where.order_no = { [Op.like]: '%' + order_no + '%' };
    }
    if (status !== undefined && status !== '') {
      where.status = parseInt(status);
    }
    if (user_id) {
      where.user_id = user_id;
    }

    if (start_time || end_time) {
      where.create_time = {};
      if (start_time) {
        where.create_time[Op.gte] = new Date(start_time);
      }
      if (end_time) {
        where.create_time[Op.lte] = new Date(end_time);
      }
    }

    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;

    const result = await ctx.model.UserRecharge.findAndCountAll({
      where,
      limit,
      offset,
      order: [[ 'create_time', 'DESC' ]],
      include: [
        {
          model: ctx.model.SysUser,
          as: 'user',
          attributes: [ 'user_id', 'username', 'nickname' ],
        },
        {
          model: ctx.model.SysUser,
          as: 'sales_user',
          attributes: [ 'user_id', 'username', 'nickname' ],
        },
      ],
    });

    const formattedList = result.rows.map(row => {
      const item = row.toJSON();
      if (item.amount) item.amount = Number(item.amount);
      if (item.fee) item.fee = Number(item.fee);
      if (item.system_receive_amount) item.system_receive_amount = Number(item.system_receive_amount);
      if (item.user_receive_amount) item.user_receive_amount = Number(item.user_receive_amount);
      return item;
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        list: formattedList,
        total: result.count,
        page: parseInt(page),
        page_size: limit,
      },
    };
  }
}

module.exports = AdminInnerRechargeController;