'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { BIGINT, DATE } = Sequelize;

    await queryInterface.createTable('sys_shop_menu', {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '创建时间',
      }
    });

    const [results] = await queryInterface.sequelize.query(`SHOW INDEX FROM sys_shop_menu WHERE Key_name = 'idx_sys_shop_menu_shop_id'`);
    if (results.length === 0) {
      await queryInterface.addIndex('sys_shop_menu', ['shop_id'], {
        name: 'idx_sys_shop_menu_shop_id',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sys_shop_menu');
  },
};
