'use strict';

const Service = require('egg').Service;

class BackMoneyService extends Service {
  /**
   * 获取用户返款信息
   * @param {string|number} userId 用户的标识（user_code 或 user_id）
   */
  async getUserBackMoney(userId) {
    const { ctx } = this;

    // 获取用户主键
    const userObj = await ctx.model.User.findOne({ where: { user_id: userId } });
    const dbUserId = userObj ? userObj.id : userId;

    const user = await ctx.model.User.findByPk(dbUserId, {
      attributes: [ 'id', 'user_id', 'static_income', 'dynamic_income' ],
    });

    if (!user) {
      ctx.throw(404, '用户不存在');
    }

    // staticBack 取自用户做任务的总收入 (通过统计 user_tasks 表的 reward 字段得出)
    const totalReward = await ctx.model.UserTask.sum('reward', {
      where: { user_id: dbUserId, status: 1 },
    });
    const staticBack = Number(totalReward || 0);

    // trendBacks: 查询用户所有已完成的任务订单记录
    const tasks = await ctx.model.UserTask.findAll({
      where: { user_id: dbUserId, status: 1 },
      order: [[ 'updated_at', 'DESC' ]],
    });

    const trendBacks = tasks.map(task => ({
      userId: user.user_id,
      trendBack: Number(task.reward || 0).toString(),
      utime: task.updated_at ? new Date(task.updated_at).toISOString() : null,
    }));

    return {
      staticBack,
      trendBacks,
    };
  }
}

module.exports = BackMoneyService;
