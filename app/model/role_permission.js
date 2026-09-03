'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const RolePermission = app.model.define('role_permission', {
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
    role: {
      type: INTEGER,
      allowNull: false,
      comment: '角色：1管理员 2主管 3业务员',
    },
    permission_name: {
      type: STRING(64),
      allowNull: false,
      comment: '权限标识',
    },
  }, {
    tableName: 'role_permissions',
    comment: '角色权限关联表',
    indexes: [
      {
        fields: [ 'role', 'permission_name' ],
        unique: true,
      },
    ],
  });

  return RolePermission;
};
