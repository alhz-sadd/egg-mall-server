'use strict';
const tableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, INTEGER, DATE, STRING, DECIMAL } = app.Sequelize;

  const ShopTaskUserItemProgress = app.model.define(tableNames.SHOP_TASK_USER_ITEM_PROGRESS, {
    id: {
      type: BIGINT(20),
      primaryKey: true,
      autoIncrement: true,
      comment: '主键',
    },
    shop_task_user_id: {
      type: BIGINT(20),
      allowNull: false,
      comment: '关联 shop_task_user.id',
    },
    user_id: {
      type: BIGINT(20),
      allowNull: false,
      comment: '关联 sys_user.user_id',
    },
    task_item_id: {
      type: BIGINT(20),
      allowNull: false,
      comment: '关联 shop_task_item.item_id',
    },
    order_id: {
      type: STRING(64),
      allowNull: true,
      comment: '对应生成的订单号',
    },
    goods_id: {
      type: BIGINT(20),
      allowNull: true,
      comment: '动态匹配的商品ID',
    },
    goods_price: {
      type: DECIMAL(10, 2),
      allowNull: true,
      comment: '实际订单金额',
    },
    goods_title: {
      type: STRING(255),
      allowNull: true,
      comment: '动态匹配的商品标题',
    },
    status: {
      type: INTEGER,
      defaultValue: 0,
      comment: '任务子项状态 0=未完成, 1=已完成, 等等',
    },
    revenue: {
      type: DECIMAL(20, 5),
      defaultValue: 0.00000,
      comment: '该子项产生的收益',
    },
    is_triggered: {
      type: INTEGER,
      defaultValue: 0,
      comment: '订单是否已触发：0否 1是',
    },
    is_processing: {
      type: INTEGER,
      defaultValue: 0,
      comment: '是否正在进行中：0否 1是',
    },
    create_time: {
      type: DATE,
      allowNull: true,
      comment: '创建时间',
    },
    update_time: {
      type: DATE,
      allowNull: true,
      comment: '更新时间',
    },
    is_deleted: {
      type: INTEGER,
      defaultValue: 0,
      comment: '逻辑删除：0未删除，1已删除',
    }
  }, {
    tableName: tableNames.SHOP_TASK_USER_ITEM_PROGRESS,
    timestamps: false, // 如果需要sequelize自动维护，可开启并映射字段
  });

  return ShopTaskUserItemProgress;
};
