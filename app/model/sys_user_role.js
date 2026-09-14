'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT } = app.Sequelize;

  const SysUserRole = app.model.define(TableNames.SYS_USER_ROLE || 'sys_user_role', {
    id: {
      type: BIGINT(20),
      primaryKey: true,
      autoIncrement: true,
      comment: '主键',
    },
    user_id: {
      type: BIGINT(20),
      allowNull: false,
      comment: '用户ID (sys_user.user_id)',
    },
    role_id: {
      type: BIGINT(20),
      allowNull: false,
      comment: '角色ID (sys_role.role_id)',
    },
  }, {
    tableName: 'sys_user_role',
    comment: '用户角色关联表',
    timestamps: false,
    underscored: false,
  });

  return SysUserRole;
};
