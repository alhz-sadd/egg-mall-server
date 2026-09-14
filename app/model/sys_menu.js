'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DATE, INTEGER } = app.Sequelize;

  const SysMenu = app.model.define(TableNames.SYS_MENU, {
    menu_id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键',
    },
    parent_id: {
      type: BIGINT,
      allowNull: true,
      defaultValue: 0,
      comment: '父菜单ID，0为一级菜单',
    },
    menu_name: {
      type: STRING(100),
      allowNull: false,
      comment: '菜单名称',
    },
    menu_type: {
      type: TINYINT,
      allowNull: false,
      comment: '1菜单，2按钮',
    },
    route_path: {
      type: STRING(255),
      allowNull: true,
      comment: '前端路由地址',
    },
    component: {
      type: STRING(255),
      allowNull: true,
      comment: '前端组件路径',
    },
    api_tag: {
      type: STRING(20),
      allowNull: false,
      comment: 'API标识：inner/outer',
    },
    perms: {
      type: STRING(255),
      allowNull: true,
      comment: '权限标识',
    },
    icon: {
      type: STRING(255),
      allowNull: true,
      comment: '菜单图标',
    },
    sort: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序',
    },
    enable: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '0禁用 1启用',
    },
    create_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '创建时间',
    },
    update_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '更新时间',
    },
  }, {
    tableName: 'sys_menu',
    timestamps: false,
    underscored: false,
  });

  SysMenu.associate = function() {
    // 菜单与角色是多对多关系，通过 sys_role_menu 关联
    app.model.SysMenu.belongsToMany(app.model.SysRole, {
      through: app.model.SysRoleMenu,
      foreignKey: 'menu_id',
      otherKey: 'role_id',
    });
  };

  return SysMenu;
};
