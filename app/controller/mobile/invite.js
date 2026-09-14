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

    // 获取用户钱包信息（为了拿 total_invite_income）
    const wallet = await ctx.model.UserWallet.findOne({
      where: { user_id: userId },
      attributes: [ 'total_invite_income' ],
    });

    const totalIncome = wallet ? wallet.total_invite_income : '0.00';

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
