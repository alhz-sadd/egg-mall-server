'use strict';

const Subscription = require('egg').Subscription;

class CleanLog extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      cron: '0 0 8 * * *', // 每天早上 8 点执行
      type: 'worker', // 某一个 worker 执行
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const { ctx } = this;
    // Egg 默认集成了 moment (如果没有可以直接用 Date)
    // 为了保险起见，使用原生的 Date 来计算 1 个月前的时间
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { Op } = ctx.app.Sequelize;

    try {
      // 1. 获取需要清理的数据总量（操作日志）
      const operLogCount = await ctx.model.SysOperLog.count({
        where: {
          oper_time: {
            [Op.lt]: oneMonthAgo,
          },
        },
      });

      // 2. 分批删除操作日志 (每次 1000 条，防止长事务锁表)
      let operLogDeleted = 0;
      const batchSize = 1000;
      if (operLogCount > 0) {
        let remaining = operLogCount;
        while (remaining > 0) {
          const limit = Math.min(remaining, batchSize);
          // 在 MySQL 中，使用 limit 分批删除可以有效减少锁表时间
          const affectedRows = await ctx.model.SysOperLog.destroy({
            where: {
              oper_time: {
                [Op.lt]: oneMonthAgo,
              },
            },
            limit,
          });
          if (affectedRows === 0) break;
          operLogDeleted += affectedRows;
          remaining -= affectedRows;

          // 每次删除后短暂休眠 50ms，让出数据库资源，防止阻塞正常业务
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // 3. 获取需要清理的数据总量（登录日志）
      const loginLogCount = await ctx.model.UserLoginLog.count({
        where: {
          login_time: {
            [Op.lt]: oneMonthAgo,
          },
        },
      });

      // 4. 分批删除登录日志
      let loginLogDeleted = 0;
      if (loginLogCount > 0) {
        let remaining = loginLogCount;
        while (remaining > 0) {
          const limit = Math.min(remaining, batchSize);
          const affectedRows = await ctx.model.UserLoginLog.destroy({
            where: {
              login_time: {
                [Op.lt]: oneMonthAgo,
              },
            },
            limit,
          });
          if (affectedRows === 0) break;
          loginLogDeleted += affectedRows;
          remaining -= affectedRows;

          // 每次删除后短暂休眠 50ms
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      ctx.logger.info(`[自动清理日志] 成功清理 1 个月前的日志。操作日志: ${operLogDeleted} 条，登录日志: ${loginLogDeleted} 条`);
    } catch (error) {
      ctx.logger.error('[自动清理日志] 清理日志失败:', error);
    }
  }
}

module.exports = CleanLog;
