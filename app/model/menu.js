'use strict';

module.exports = app => {
  const { STRING, INTEGER, BOOLEAN, JSON } = app.Sequelize;

  const Menu = app.model.define('menu', {
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
      allowNull: true,
      comment: '父级ID',
    },
    name: {
      type: STRING(64),
      allowNull: false,
      comment: '名称',
    },
    path: {
      type: STRING(128),
      allowNull: false,
      comment: '路径',
    },
    component: {
      type: STRING(128),
      allowNull: true,
      comment: '组件',
    },
    redirect: {
      type: STRING(128),
      allowNull: true,
      comment: '跳转',
    },
    hidden: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否隐藏',
    },
    alwaysShow: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否总是显示',
    },
    meta: {
      type: JSON,
      allowNull: true,
      comment: '元信息',
    },
    sort: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序',
    },
    type: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '类型（0=目录，1=菜单，2=按钮）',
    },
    is_ext: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否外链',
    },
    keep_alive: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '是否缓存',
    },
    status: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '状态',
    },
    permission: {
      type: STRING(64),
      allowNull: true,
      comment: '权限字符',
    },
  }, {
    tableName: 'menus',
    comment: '菜单表',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Menu;
};
