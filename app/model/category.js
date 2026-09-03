'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const Category = app.model.define('category', {
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
    name: {
      type: STRING(64),
      allowNull: false,
      comment: '分类名称',
    },
    parent_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '父分类ID，0为一级分类',
    },
    level: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '层级',
    },
    sort: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序值',
    },
    icon: {
      type: STRING(255),
      comment: '图标地址',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1启用 0禁用',
    },
  }, {
    tableName: 'categories',
    comment: '商品分类表',
  });

  return Category;
};

