'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const Permission = app.model.define('permission', {
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
    parent_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '父权限ID，0为顶级节点',
    },
    title: {
      type: STRING(64),
      allowNull: false,
      comment: '权限标题',
    },
    name: {
      type: STRING(64),
      allowNull: false,
      unique: true,
      comment: '权限标识',
    },
    type: {
      type: STRING(32),
      allowNull: false,
      defaultValue: '菜单',
      comment: '权限类型：菜单/按钮',
    },
    sort: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '排序值',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1启用 0禁用',
    },
  }, {
    tableName: 'permissions',
    comment: '权限树表',
  });

  return Permission;
};
