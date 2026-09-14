'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('sys_user');

    if (!tableInfo.is_recharged) {
      await queryInterface.addColumn('sys_user', 'is_recharged', {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: '0未充值 1已充值；冗余展示，权威数据以充值订单为准',
      });
      await queryInterface.addIndex('sys_user', [ 'is_recharged' ], {
        name: 'idx_is_recharged',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('sys_user');

    if (tableInfo.is_recharged) {
      await queryInterface.removeIndex('sys_user', 'idx_is_recharged');
      await queryInterface.removeColumn('sys_user', 'is_recharged');
    }
  },
};
