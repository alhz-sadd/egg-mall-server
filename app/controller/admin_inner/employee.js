'use strict';

const Controller = require('egg').Controller;

class EmployeeController extends Controller {
  // 获取员工列表 (支持店长 2 和 业务员 3)
  async index() {
    const { ctx } = this;
    const query = ctx.query;

    // 如果没有指定 user_type，默认返回 2 和 3
    if (!query.user_type) {
      query.user_type_in = [ 2, 3 ];
    }

    // 如果当前登录用户是商家(user_type=2)或业务员(user_type=3)，则强制只能看到自己店铺下的员工
    // 注意：admin-inner 接口主要供 A端管理员使用，但为了安全保留此逻辑
    const currentUser = ctx.state.adminInner;
    if (currentUser && currentUser.shop_id && [ 2, 3 ].includes(Number(currentUser.user_type))) {
      query.shop_id = currentUser.shop_id;
    }

    const result = await ctx.service.adminInnerUser.list(query);
    ctx.body = {
      code: 200,
      message: '获取成功',
      data: result,
    };
  }

  // 获取员工详情
  async show() {
    const { ctx } = this;
    const { id } = ctx.params;
    const result = await ctx.service.adminInnerUser.detail(id);
    if (!result || ![ 2, 3 ].includes(Number(result.user_type))) {
      ctx.throw(404, '员工不存在');
    }
    ctx.body = {
      code: 200,
      message: '获取成功',
      data: result,
    };
  }

  // 创建员工 (店长 / 业务员)
  async create() {
    const { ctx } = this;
    const payload = ctx.request.body;

    // Validate request
    ctx.assert(payload.username, 422, '账号不能为空');
    ctx.assert(payload.password, 422, '密码不能为空');
    ctx.assert(payload.user_type, 422, '员工类型不能为空 (2:店长, 3:业务员)');

    if (payload.email) {
      ctx.assert(/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(payload.email), 422, '邮箱格式不正确');
    }

    const transaction = await ctx.model.transaction();
    try {
      let shopId = payload.shop_id;

      // 如果创建的是店长(user_type=2) 且提供了 shop_name，支持顺便创建新店铺
      if (Number(payload.user_type) === 2 && !shopId && payload.shop_name) {
        const shop = await ctx.service.shop.create({
          shop_name: payload.shop_name,
          shop_no: payload.shop_no,
          contact_person: payload.contact_person || payload.nickname || payload.username,
          contact_phone: payload.contact_phone || payload.phone,
          province: payload.province,
          city: payload.city,
          district: payload.district,
          address: payload.address,
          logo: payload.logo,
          business_scope: payload.business_scope,
          expire_time: payload.expire_time,
          remark: payload.remark,
          create_user_id: ctx.state.adminInner.adminInnerId,
        }, { transaction });
        shopId = shop.shop_id;
      }

      // 如果当前登录不是管理员，则强制使用其所在店铺的 shop_id
      const currentUser = ctx.state.adminInner;
      if (currentUser && currentUser.shop_id && [ 2, 3 ].includes(Number(currentUser.user_type))) {
        shopId = currentUser.shop_id;
      }

      payload.shop_id = shopId;

      const result = await ctx.service.adminInnerUser.create(payload, { transaction });
      await transaction.commit();

      ctx.body = {
        code: 200,
        message: '创建成功',
        data: result,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // 更新员工
  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const payload = ctx.request.body;

    // Validate request
    if (payload.email) {
      ctx.assert(/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(payload.email), 422, '邮箱格式不正确');
    }

    const user = await ctx.service.adminInnerUser.detail(id);
    if (!user || ![ 2, 3 ].includes(Number(user.user_type))) {
      ctx.throw(404, '员工不存在');
    }

    const result = await ctx.service.adminInnerUser.update(id, payload);
    ctx.body = {
      code: 200,
      message: '更新成功',
      data: result,
    };
  }

  // 删除员工
  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    const user = await ctx.service.adminInnerUser.detail(id);
    if (!user || ![ 2, 3 ].includes(Number(user.user_type))) {
      ctx.throw(404, '员工不存在');
    }

    await ctx.service.adminInnerUser.destroy(id, ctx.state.adminInner);
    ctx.body = {
      code: 200,
      message: '删除成功',
    };
  }

  // 获取指定员工下的普通用户列表 (业务员发展的客户)
  async listCustomers() {
    const { ctx } = this;
    const { id } = ctx.params;

    const employee = await ctx.model.SysUser.findOne({
      where: { user_id: id, is_deleted: 0 },
    });

    if (!employee || ![ 2, 3 ].includes(Number(employee.user_type))) {
      ctx.throw(404, '员工不存在');
    }

    const query = {
      ...ctx.query,
      user_type: 4, // 普通用户
      inviter_user_id: id, // 使用邀请人ID匹配
    };

    // 确保分页参数是数字
    query.page = Number(query.page || 1);
    query.page_size = Number(query.page_size || 10);

    const result = await ctx.service.adminInnerUser.list(query);

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: result,
    };
  }

  // 获取业绩统计
  async performance() {
    const { ctx } = this;
    const result = await ctx.service.adminInnerUser.performance(ctx.query);
    ctx.body = {
      code: 200,
      message: '获取成功',
      data: result,
    };
  }
}

module.exports = EmployeeController;
