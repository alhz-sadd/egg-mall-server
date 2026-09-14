'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, DATE } = app.Sequelize;

  const SysRoleMenu = app.model.define(TableNames.SYS_ROLE_MENU, {
    role_id: {
      type: BIGINT,
      primaryKey: true,
      allowNull: false,
      field: 'role_id',
      comment: 'sys_role.role_id',
    },
    menu_id: {
      type: BIGINT,
      primaryKey: true,
      allowNull: false,
      field: 'menu_id',
      comment: 'sys_menu.menu_id',
    },
    create_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '创建时间',
    },
  }, {
    tableName: TableNames.SYS_ROLE_MENU,
    timestamps: false,
    underscored: false,
  });

  return SysRoleMenu;
};
