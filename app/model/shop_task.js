'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, STRING, DECIMAL, INTEGER, TINYINT, DATE } = app.Sequelize;

  const ShopTask = app.model.define(TableNames.SHOP_TASK, {
    task_id: {
      type: BIGINT,
      autoIncrement: true,
      primaryKey: true,
      comment: '主键',
    },
    shop_id: {
      type: BIGINT,
      allowNull: false,
      comment: '归属店铺ID',
    },
    task_name: {
      type: STRING(128),
      allowNull: false,
      comment: '任务名称',
    },
    min_amount: {
      type: DECIMAL(16, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '最低金额',
    },
    yield_rate: {
      type: DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: '收益率',
    },
    parent_yield_rate: {
      type: DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: '上级收益率',
    },
    task_count: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '任务单数',
    },
    balance_min_rate: {
      type: DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: '余额最小使用率',
    },
    balance_max_rate: {
      type: DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: '余额最大使用率',
    },
    task_type: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '类型 0:默认, 1:自定义',
    },
    status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '状态 0:停用, 1:启用',
    },
    check_parent: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '是否校验上级 0:不校验 1:校验',
    },
    daily_update_type: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '每日任务更新 0:手动, 1:自动',
    },
    lucky_team_assign: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '幸运单团队分配 0:不分配 1:分配',
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
    is_deleted: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'shop_task',
    timestamps: false,
  });

  ShopTask.associate = function() {
    app.model.ShopTask.belongsTo(app.model.Shop, { foreignKey: 'shop_id', as: 'shop' });
    app.model.ShopTask.hasMany(app.model.ShopTaskItem, { foreignKey: 'task_id', as: 'items' });
  };

  return ShopTask;
};
