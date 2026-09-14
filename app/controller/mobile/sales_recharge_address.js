'use strict';

const Controller = require('egg').Controller;

class MobileSalesRechargeAddressController extends Controller {
  /**
   * @summary 获取推荐人（业务员）的默认充值地址
   * @description C端用户进入充值页面时调用。查询当前用户归属的业务员设置的默认USDT收款地址。
   * @router get /api/mobile/sales-address/default
   * @response 200 ApiResponse
   */
  async getDefaultAddress() {
    const { ctx } = this;
    const { userId } = ctx.state.user; // 当前C端用户ID

    // 1. 查询当前 C端用户的上级关系
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: userId },
    });

    if (!relation || !relation.salesman_user_id) {
      // 没有任何上级，或者上级不是业务员，就不返回地址
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: null,
      };
      return;
    }

    const salesmanUserId = relation.salesman_user_id;

    // 2. 查询该业务员的默认启用收款地址
    const addressInfo = await ctx.model.SalesRechargeAddress.findOne({
      where: {
        user_id: salesmanUserId,
        is_default: 1,
        status: 1,
      },
      attributes: [ 'address', 'chain_type', 'remark' ],
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: addressInfo || null,
    };
  }
}

module.exports = MobileSalesRechargeAddressController;
