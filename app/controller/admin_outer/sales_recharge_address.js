'use strict';

const Controller = require('egg').Controller;

class AdminOuterSalesRechargeAddressController extends Controller {

  /**
   * @summary 获取业务员收款地址列表
   * @description B端 (店长/业务员) 获取业务员的收款地址
   * @router get /api/admin-outer/sales-address
   * @request query integer user_id 业务员ID (店长必传，业务员自动取自己)
   * @request query integer status 状态 (0禁用 1启用)
   * @request query integer page 页码
   * @request query integer page_size 每页数量
   * @response 200 ApiResponse
   */
  async index() {
    const { ctx, service } = this;
    const { user_type, userId: loginUserId } = ctx.state.user;
    let { user_id, status, page, page_size } = ctx.query;

    // 权限与入参校验
    if (user_type === 3) {
      user_id = loginUserId; // 业务员只能查自己
    } else if (user_type === 2) {
      if (!user_id) {
        ctx.throw(400, '店长查询需指定业务员 user_id');
      }
    } else {
      ctx.throw(403, '无权限');
    }

    const result = await service.salesRechargeAddress.list({ user_id, status, page, page_size });

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * @summary 新增收款地址
   * @router post /api/admin-outer/sales-address
   */
  async create() {
    const { ctx, service } = this;
    const { user_type, userId: loginUserId } = ctx.state.user;
    const body = ctx.request.body;

    ctx.validate({
      address: 'string',
      chain_type: { type: 'string', required: false },
      is_default: { type: 'int', required: false },
      status: { type: 'int', required: false },
      remark: { type: 'string', required: false },
    }, body);

    let targetUserId = body.user_id;

    if (user_type === 3) {
      targetUserId = loginUserId;
    } else if (user_type === 2) {
      if (!targetUserId) ctx.throw(400, '店长添加需指定业务员 user_id');
    } else {
      ctx.throw(403, '无权限');
    }

    const data = await service.salesRechargeAddress.create({
      ...body,
      user_id: targetUserId,
    });

    ctx.body = {
      code: 200,
      message: '添加成功',
      data,
    };
  }

  /**
   * @summary 修改收款地址
   * @router put /api/admin-outer/sales-address/:id
   */
  async update() {
    const { ctx, service } = this;
    const { user_type, userId: loginUserId } = ctx.state.user;
    const id = ctx.params.id;
    const body = ctx.request.body;

    let targetUserId = body.user_id;

    if (user_type === 3) {
      targetUserId = loginUserId;
    } else if (user_type === 2) {
      if (!targetUserId) {
        // 如果前端没传，先查出来归属
        const addressInfo = await ctx.model.SalesRechargeAddress.findByPk(id);
        if (!addressInfo) ctx.throw(404, '地址不存在');
        targetUserId = addressInfo.user_id;
      }
    } else {
      ctx.throw(403, '无权限');
    }

    const data = await service.salesRechargeAddress.update(id, targetUserId, body);

    ctx.body = {
      code: 200,
      message: '修改成功',
      data,
    };
  }

  /**
   * @summary 删除收款地址
   * @router delete /api/admin-outer/sales-address/:id
   */
  async destroy() {
    const { ctx, service } = this;
    const { user_type, userId: loginUserId } = ctx.state.user;
    const id = ctx.params.id;

    let targetUserId = ctx.query.user_id;

    if (user_type === 3) {
      targetUserId = loginUserId;
    } else if (user_type === 2) {
      if (!targetUserId) {
        const addressInfo = await ctx.model.SalesRechargeAddress.findByPk(id);
        if (!addressInfo) ctx.throw(404, '地址不存在');
        targetUserId = addressInfo.user_id;
      }
    } else {
      ctx.throw(403, '无权限');
    }

    await service.salesRechargeAddress.destroy(id, targetUserId);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = AdminOuterSalesRechargeAddressController;
