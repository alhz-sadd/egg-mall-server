'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING } = Sequelize;
    await queryInterface.addColumn('sys_user', 'receipt_name', {
      type: STRING(64),
      allowNull: true,
      comment: '收货人姓名',
    });
    await queryInterface.addColumn('sys_user', 'receipt_phone', {
      type: STRING(20),
      allowNull: true,
      comment: '收货人手机号',
    });
    await queryInterface.addColumn('sys_user', 'receipt_address', {
      type: STRING(500),
      allowNull: true,
      comment: '收货人详细地址',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('sys_user', 'receipt_name');
    await queryInterface.removeColumn('sys_user', 'receipt_phone');
    await queryInterface.removeColumn('sys_user', 'receipt_address');
  },
};
