'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, INTEGER, TINYINT, DECIMAL, DATE, STRING } = app.Sequelize;

  const ShopTaskItem = app.model.define(TableNames.SHOP_TASK_ITEM, {
    item_id: {
      type: BIGINT,
      autoIncrement: true,
      primaryKey: true,
      comment: '主键',
    },
    task_id: {
      type: BIGINT,
      allowNull: false,
      comment: '关联shop_task.task_id',
    },
    item_type: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '任务类型 1:普通订单任务, 2:幸运订单任务',
    },
    sort: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '任务执行顺序',
    },
    require_count: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '需要完成的笔数',
    },
    yield_rate: {
      type: DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '子项独立收益率',
    },
    is_lucky_order: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '是否幸运订单 0否 1是',
    },
    rule_type: {
      type: TINYINT,
      allowNull: true,
      comment: '规则类型：1=智能匹配，2=手动匹配',
    },
    append_amount: {
      type: DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '追加金额',
    },
    goods_price: {
      type: DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '商品价格',
    },
    goods_title: {
      type: STRING(255),
      allowNull: true,
      comment: '商品标题',
    },
    goods_id: {
      type: BIGINT,
      allowNull: true,
      comment: '商品ID',
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
    tableName: 'shop_task_item',
    timestamps: false,
  });

  ShopTaskItem.associate = function() {
    app.model.ShopTaskItem.belongsTo(app.model.ShopTask, { foreignKey: 'task_id', as: 'task' });
  };

  return ShopTaskItem;
};
