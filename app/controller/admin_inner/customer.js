'use strict';

const Controller = require('egg').Controller;

class AdminInnerCustomerController extends Controller {
  /**
   * 获取店铺的C端用户列表 (A端专用)
   */
  async index() {
    const { ctx, service } = this;
    const { shop_id } = ctx.params;
    
    if (!shop_id) {
      ctx.throw(400, '缺少店铺ID参数');
    }

    try {
      // 传递 user_type: 1 表示这是平台管理员在查询，所以不受业务员过滤等限制
      const result = await service.adminOuterCustomer.getCustomerList(ctx.query, { 
        user_type: 1, 
        shop_id 
      });
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[AdminInnerCustomerController.index] 获取店铺C端用户列表失败', error);
      ctx.body = {
        code: 500,
        message: '获取C端用户列表失败',
        data: null,
      };
    }
  }

  /**
   * 获取C端用户活跃信息
   */
  async activeInfo() {
    const { ctx, service } = this;
    const { customer_user_id } = ctx.query;

    if (!customer_user_id) {
      ctx.throw(400, '缺少参数 customer_user_id');
    }

    try {
      // 平台端不需要校验 shopId
      const result = await service.customer.getActiveInfo(customer_user_id);
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[AdminInnerCustomerController.activeInfo] 获取C端用户活跃信息失败:', error);
      ctx.throw(error.status || 500, error.message || '获取C端用户活跃信息失败');
    }
  }

  /**
   * 获取C端用户登录操作日志列表
   */
  async loginLogList() {
    const { ctx, service } = this;
    const customerUserId = ctx.params.customerUserId;
    const { pageNum = 1, pageSize = 10 } = ctx.query;

    if (!customerUserId) {
      ctx.throw(400, '缺少参数 customerUserId');
    }

    try {
      // 平台端不需要校验 shopId，传 null
      const result = await service.customer.getLoginLogList(customerUserId, pageNum, pageSize, null);
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: result,
      };
    } catch (error) {
      ctx.logger.error('[AdminInnerCustomerController.loginLogList] 获取C端用户登录日志失败:', error);
      ctx.throw(error.status || 500, error.message || '获取C端用户登录日志失败');
    }
  }

  /**
   * 修改客户提现密码
   */
  async updateWithdrawPassword() {
    const { ctx, service } = this;
    const userId = ctx.params.id;
    const { withdraw_pwd } = ctx.request.body;

    if (!userId) {
      ctx.throw(400, '缺少用户ID参数');
    }
    if (!withdraw_pwd) {
      ctx.throw(400, '新提现密码不能为空');
    }

    const currentUser = ctx.state.adminInner; // 平台端管理员
    await service.user.resetMemberWithdrawPassword(userId, withdraw_pwd, { role: 1, id: currentUser.user_id });

    ctx.body = {
      code: 200,
      message: '提现密码修改成功',
      data: null,
    };
  }

  /**
   * 获取C端用户层级关系
   */
  async relationTree() {
    const { ctx } = this;
    const { customerUserId } = ctx.params;
    const { pageNum = 1, pageSize = 10 } = ctx.query;

    // A端不限制店铺
    const shopId = null;

    if (!customerUserId) {
      ctx.throw(400, '用户ID不能为空');
    }

    const data = await ctx.service.customer.getRelationTree(
      customerUserId,
      shopId,
      pageNum,
      pageSize,
    );

    ctx.body = {
      code: 200,
      message: '获取成功',
      data,
    };
  }

  /**
   * 获取C端用户资金明细
   */
  async fundDetails() {
    const { ctx, service } = this;
    const userId = ctx.params.id;
    const adminInner = ctx.state.adminInner;

    if (!userId) {
      ctx.throw(400, '缺少用户ID参数');
    }

    try {
      const data = await service.fundRecord.getFundDetails(userId, ctx.query, {
        role: 1, // A端角色为1
        adminId: adminInner.user_id,
      });

      ctx.body = {
        code: 200,
        message: '获取成功',
        data,
      };
    } catch (error) {
      ctx.logger.error('[AdminInnerCustomerController.fundDetails] 获取资金明细失败:', error);
      ctx.throw(error.status || 500, error.message || '获取资金明细失败');
    }
  }
}

module.exports = AdminInnerCustomerController;
