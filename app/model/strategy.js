'use strict';

module.exports = app => {
  const { STRING, INTEGER, DECIMAL } = app.Sequelize;

  const Strategy = app.model.define('strategy', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '策略ID',
    },
    admin_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '关联的店铺(管理员)ID',
    },
    name: {
      type: STRING(128),
      allowNull: false,
      comment: '策略名',
    },
    min_amount: {
      type: DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '最低金额',
    },
    profit_rate: {
      type: DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: '收益率',
    },
    parent_profit_rate: {
      type: DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: '上级收益率',
    },
    type: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '类型：0默认 1自定义',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '状态：0启用 1禁用',
    },
    verify_parent: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '是否验证上级：0验证 1不验证',
    },
    daily_task_update: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '每日任务更新：0手动 1自动',
    },
    lucky_order_team_reward: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '幸运订单团队奖励分配：0分配 1不分配',
    },
    task_count: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '任务单数',
    },
    min_usage_rate: {
      type: DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: '余额最小使用率',
    },
    max_usage_rate: {
      type: DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: '余额最大使用率',
    },
  }, {
    tableName: 'strategies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: '策略表',
  });

  return Strategy;
};
