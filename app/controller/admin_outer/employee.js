'use strict';

const Controller = require('egg').Controller;

class AdminOuterEmployeeController extends Controller {
  // 获取员工列表 (仅限当前店铺)
  async index() {
    const { ctx } = this;
    const query = ctx.query;

    // auth 中间件会将解码后的 token 放入 ctx.state.adminOuter
    const shopId = ctx.state.adminOuter ? ctx.state.adminOuter.shop_id : null;

    if (!shopId) {
      ctx.throw(403, '未绑定店铺，无法访问员工数据');
    }

    // 限定只能查询本店铺的数据
    query.shop_id = shopId;

    // 默认查询业务员(3)和店长(2)，或者前端指定
    if (!query.user_type) {
      query.user_type_in = [ 2, 3 ];
    }

    const result = await ctx.service.adminOuterUser.getAdminOuterUsers(query);
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
    const shopId = ctx.state.adminOuter ? ctx.state.adminOuter.shop_id : null;

    if (!shopId) {
      ctx.throw(403, '未绑定店铺');
    }

    const user = await ctx.service.adminOuterUser.findById(id);
    if (!user) {
      ctx.throw(404, '员工不存在');
    }

    // 校验权限：只能查看本店铺的员工
    if (user.shop_id !== shopId) {
      ctx.throw(403, '无权查看该员工信息');
    }

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: user,
    };
  }

  // 创建员工 (仅限店长创建业务员)
  async create() {
    const { ctx } = this;
    const payload = ctx.request.body;
    const adminOuter = ctx.state.adminOuter || {};
    const shopId = adminOuter.shop_id;

    if (!shopId) {
      ctx.throw(403, '未绑定店铺，无法创建员工');
    }

    // 校验当前操作人是否是店长 (user_type = 2)
    if (adminOuter.user_type !== 2) {
      ctx.throw(403, '仅店长可以创建业务员');
    }

    // 强制绑定为当前店铺，并强制类型为业务员 (3)
    payload.shop_id = shopId;
    payload.user_type = 3;

    // 添加创建人信息
    payload.created_by = adminOuter.id;

    const result = await ctx.service.adminOuterUser.create(payload);
    ctx.body = {
      code: 200,
      message: '创建成功',
      data: result,
    };
  }

  // 修改员工信息 (仅限店长修改本店铺业务员)
  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const payload = ctx.request.body;
    const adminOuter = ctx.state.adminOuter || {};
    const shopId = adminOuter.shop_id;

    if (!shopId) {
      ctx.throw(403, '未绑定店铺');
    }

    // 校验当前操作人是否是店长 (user_type = 2)
    if (adminOuter.user_type !== 2) {
      ctx.throw(403, '仅店长可以修改员工信息');
    }

    const user = await ctx.service.adminOuterUser.findById(id);
    if (!user) {
      ctx.throw(404, '员工不存在');
    }

    // 校验权限：只能修改本店铺的业务员
    if (user.shop_id !== shopId || user.user_type !== 3) {
      ctx.throw(403, '无权修改该员工信息或只能修改业务员');
    }

    // 不允许修改关键字段
    delete payload.shop_id;
    delete payload.user_type;
    delete payload.username;

    // 添加修改人信息
    payload.updated_by = adminOuter.id;

    await ctx.service.adminOuterUser.update(id, payload);
    ctx.body = {
      code: 200,
      message: '修改成功',
      data: null,
    };
  }

  // 删除员工 (仅限店长删除本店铺业务员)
  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;
    const adminOuter = ctx.state.adminOuter || {};
    const shopId = adminOuter.shop_id;

    if (!shopId) {
      ctx.throw(403, '未绑定店铺');
    }

    // 校验当前操作人是否是店长 (user_type = 2)
    if (adminOuter.user_type !== 2) {
      ctx.throw(403, '仅店长可以删除员工');
    }

    const user = await ctx.service.adminOuterUser.findById(id);
    if (!user) {
      ctx.throw(404, '员工不存在');
    }

    // 校验权限：只能删除本店铺的业务员
    if (user.shop_id !== shopId || user.user_type !== 3) {
      ctx.throw(403, '无权删除该员工或只能删除业务员');
    }

    await ctx.service.adminOuterUser.destroy(id);
    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }

  // 重置员工密码 (仅限店长操作本店铺业务员)
  async resetPassword() {
    const { ctx } = this;
    const { id } = ctx.params;

    // 强制打印请求体，方便排查 422 报错
    ctx.logger.info('Reset password payload:', ctx.request.body);

    // 兼容蛇形命名 password 和 驼峰命名 newPassword，并处理可能被包在 data 字段里的情况
    let targetPassword = ctx.request.body.password || ctx.request.body.newPassword;
    if (!targetPassword && ctx.request.body.data) {
      targetPassword = ctx.request.body.data.password || ctx.request.body.data.newPassword;
    }

    const adminOuter = ctx.state.adminOuter || {};
    const shopId = adminOuter.shop_id;

    if (!shopId) {
      ctx.throw(403, '未绑定店铺');
    }

    // 校验当前操作人是否是店长 (user_type = 2)
    if (adminOuter.user_type !== 2) {
      ctx.throw(403, '仅店长可以重置员工密码');
    }

    if (!targetPassword) {
      ctx.throw(422, '新密码不能为空');
    }

    const user = await ctx.service.adminOuterUser.findById(id);
    if (!user) {
      ctx.throw(404, '员工不存在');
    }

    // 校验权限：只能操作本店铺的业务员
    if (user.shop_id !== shopId || user.user_type !== 3) {
      ctx.throw(403, '无权操作该员工');
    }

    await ctx.service.adminOuterUser.resetPassword(id, targetPassword, adminOuter.id);
    ctx.body = {
      code: 200,
      message: '密码重置成功',
      data: null,
    };
  }
}

module.exports = AdminOuterEmployeeController;
