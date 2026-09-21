'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('shop_config', 'operate_password', {
      type: Sequelize.STRING(64),
      allowNull: false,
      defaultValue: '123456',
      comment: '操作密码',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('shop_config', 'operate_password');
  }
};
