'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller C端-邀请信息
 */
class InviteController extends Controller {
  /**
   * @summary 获取个人邀请信息
   * @description C端用户获取自己的邀请码及邀请下级总收入
   * @router get /api/mobile/invite/info
   * @request header string *Authorization
   */
  async info() {
    const { ctx, service } = this;
    const { userId } = ctx.state.user;

    // 获取用户信息（为了拿 invite_code）
    const user = await ctx.model.SysUser.findOne({
      where: { user_id: userId, is_deleted: 0 },
      attributes: [ 'invite_code' ],
    });

    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    // 获取所有下级产生的动态佣金总和
    // 逻辑：查询 user_wallet_log，user_id 为当前用户，biz_type 为 5（动态收益发放）
    const totalInviteIncomeStatsResult = await ctx.model.UserWalletLog.sum('amount', {
      where: {
        user_id: userId, // 当前用户是佣金接收者
        biz_type: 5,     // 动态收益发放
      },
    });

    const totalIncome = totalInviteIncomeStatsResult ? Number(totalInviteIncomeStatsResult).toFixed(2) : '0.00';

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        invite_code: user.invite_code || '',
        total_invite_income: totalIncome,
      },
    };
  }
}

module.exports = InviteController;
