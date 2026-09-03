'use strict';

module.exports = app => {
  const { STRING, INTEGER, DECIMAL, TEXT, JSON } = app.Sequelize;

  const Task = app.model.define('task', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: 'ID',
    },
    admin_id: {
      type: INTEGER.UNSIGNED,
      comment: '店铺管理员ID',
    },
    title: {
      type: STRING(128),
      allowNull: false,
      comment: '任务名称',
    },
    description: {
      type: TEXT,
      comment: '任务描述',
    },
    img: {
      type: STRING(255),
      comment: '缩略图地址',
    },
    images: {
      type: JSON,
      comment: '任务图片列表',
    },
    price: {
      type: DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '任务奖励',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1启用 0禁用',
    },
    audit_status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '审核状态：0待审核 1审核通过 2审核失败',
    },
    sort: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '排序，数值越大越靠前',
    },
  }, {
    tableName: 'tasks',
    comment: '任务表',
  });

  return Task;
};
