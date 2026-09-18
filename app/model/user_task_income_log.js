'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, DECIMAL, DATE, TINYINT } = app.Sequelize;

  const UserTaskIncomeLog = app.model.define(TableNames.USER_TASK_INCOME_LOG, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键ID',
    },
    user_id: {
      type: BIGINT,
      allowNull: false,
      comment: '用户ID',
    },
    task_id: {
      type: BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: '关联任务模板ID',
    },
    task_item_id: {
      type: BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: '关联任务子项ID',
    },
    order_id: {
      type: BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: '关联订单ID（订单任务使用）',
    },
    income_type: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '收益类型：1=订单任务收益 2=任务完成奖励 3=其他收益',
    },
    income_amount: {
      type: DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '收益金额，正数入账、负数扣回',
    },
    settle_time: {
      type: DATE,
      allowNull: false,
      comment: '结算时间（统计口径时间，优先用订单确认收货时间）',
    },
    create_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    update_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  }, {
    tableName: 'user_task_income_log',
    comment: '用户任务收益明细流水表',
    timestamps: false,
    underscored: false,
  });

  return UserTaskIncomeLog;
};
