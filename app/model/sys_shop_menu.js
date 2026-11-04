'use strict';

module.exports = app => {
  const { BIGINT, DATE } = app.Sequelize;

  const SysShopMenu = app.model.define('sys_shop_menu', {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键',
    },
    shop_id: {
      type: BIGINT,
      allowNull: false,
      comment: '店铺ID',
    },
    menu_id: {
      type: BIGINT,
      allowNull: false,
      comment: '菜单ID',
    },
    create_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '创建时间',
    }
  }, {
    tableName: 'sys_shop_menu',
    timestamps: false,
  });

  return SysShopMenu;
};
