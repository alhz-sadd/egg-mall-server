'use strict';

module.exports = app => {
  const { INTEGER } = app.Sequelize;

  const RoleMenu = app.model.define('role_menu', {
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
    role_id: {
      type: INTEGER,
      allowNull: false,
      comment: '角色ID',
    },
    menu_id: {
      type: INTEGER,
      allowNull: false,
      comment: '菜单ID',
    },
  }, {
    tableName: 'role_menus',
    comment: '角色菜单关联表',
    timestamps: false,
    indexes: [
      {
        fields: [ 'role_id', 'menu_id' ],
        unique: true,
      },
    ],
  });

  return RoleMenu;
};
