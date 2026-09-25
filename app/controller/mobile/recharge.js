'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 移动端-充值请求
 * 移动端充值请求控制器
 */
class MobileRechargeController extends Controller {
  /**
   * @summary 创建充值请求
   * @description 移动端用户发起充值请求
   * @router post /api/mobile/recharges
   * @request header string Authorization Bearer token
   * @request body RechargeRequest *body 充值请求信息
   * @response 200 ApiResponse 创建成功
   */
  async create() {
    const { ctx } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    if (!userId) {
      ctx.throw(401, '未登录');
    }

    const payload = ctx.request.body;
    ctx.validate({
      channel_code: { type: 'string', required: true },
      amount: { type: 'number', required: true },
      voucher_img: { type: 'string', required: false },
      remark: { type: 'string', required: false },
    }, payload);

    if (payload.amount <= 0) {
      ctx.throw(400, '充值金额必须大于0');
    }

    // 查询用户的归属关系
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: userId },
    });

    if (!relation || !relation.shop_id) {
      ctx.throw(400, '当前用户未绑定店铺，无法充值');
    }

    // 生成订单号
    const orderNo = 'RC' + Date.now() + Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    // 假设手续费为0，实际应该根据渠道配置计算
    const fee = 0;

    // 检查是否首充
    const rechargeCount = await ctx.model.UserRecharge.count({
      where: { user_id: userId, status: { [ctx.app.Sequelize.Op.in]: [1, 2] } } // 统计审核中和已通过的
    });
    const isFirstRecharge = rechargeCount === 0 ? 1 : 0;

    const newRecharge = await ctx.model.UserRecharge.create({
      order_no: orderNo,
      shop_id: relation.shop_id,
      sales_user_id: relation.salesman_user_id,
      user_id: userId,
      channel_code: payload.channel_code,
      channel_name: payload.channel_code, // 简化处理，实际应该关联查出名字
      amount: payload.amount,
      fee,
      system_receive_amount: payload.amount - fee,
      user_receive_amount: payload.amount - fee,
      voucher_img: payload.voucher_img,
      remark: payload.remark,
      status: 1, // 待审核
      is_first_recharge: isFirstRecharge,
    });

    ctx.body = {
      code: 200,
      message: '充值申请已提交',
      data: {
        id: newRecharge.id,
        order_no: newRecharge.order_no,
        status: newRecharge.status,
      },
    };
  }

  /**
   * 获取充值记录列表
   */
  async list() {
    const { ctx } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;
    if (!userId) {
      ctx.throw(401, '未登录或登录状态已失效');
    }
    const { page = 1, page_size = 10, status } = ctx.query;

    const where = { user_id: userId };
    if (status) {
      where.status = parseInt(status);
    }

    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;

    const result = await ctx.model.UserRecharge.findAndCountAll({
      where,
      limit,
      offset,
      order: [[ 'create_time', 'DESC' ]],
    });

    const formattedList = result.rows.map(row => {
      const item = row.toJSON();
      if (item.amount) item.amount = Number(item.amount);
      if (item.fee_rate) item.fee_rate = Number(item.fee_rate);
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

  /**
   * 获取充值地址及店铺充值方式
   */
  async address() {
    const { ctx } = this;
    const userId = ctx.state.user.userId || ctx.state.user.id || ctx.state.user.user_id;

    // 1. 获取用户的业务员和店铺信息
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: userId },
    });

    let salesAddress = null;

    if (relation && relation.salesman_user_id) {
      // 2. 查询该业务员的启用收款地址 (此处暂时取第一条，或者后续做成列表给用户选择)
      const addressInfo = await ctx.model.SalesRechargeAddress.findOne({
        where: {
          sales_user_id: relation.salesman_user_id,
          is_enable: 1,
          is_deleted: 0,
        },
        attributes: [ 'address', 'channel_name', 'remark' ],
      });
      salesAddress = addressInfo || null;
    }

    // 3. 获取归属店铺的充值方式
    const shopId = relation ? relation.shop_id : 0;
    const payChannels = await ctx.service.payChannel.list({
      shop_id: shopId,
      channel_type: 1, // 1表示充值
      is_enable: 1,
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        sales_address: salesAddress,
        shop_pay_channels: payChannels.list,
      },
    };
  }
}

module.exports = MobileRechargeController;
