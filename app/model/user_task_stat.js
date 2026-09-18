'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, DECIMAL, DATE, INTEGER } = app.Sequelize;

  const UserTaskStat = app.model.define(TableNames.USER_TASK_STAT, {
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
    stat_date: {
      type: DATE,
      allowNull: false,
      comment: '统计日期，格式 yyyy-MM-dd',
    },
    task_order_count: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '当日完成的任务订单数量',
    },
    task_income: {
      type: DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '当日任务收益合计',
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
    tableName: 'user_task_stat',
    comment: '用户任务日汇总统计表',
    timestamps: false,
    underscored: false,
  });

  return UserTaskStat;
};
