'use strict';
const TableNames = require('../../app/constant/table_names');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable(TableNames.SYS_USER);

    if (!tableInfo.user_withdraw_password) {
      await queryInterface.addColumn(TableNames.SYS_USER, 'user_withdraw_password', {
        type: Sequelize.STRING(128),
        allowNull: false,
        defaultValue: '',
        comment: '提现密码',
      });
    }

    if (!tableInfo.withdrawal_status) {
      await queryInterface.addColumn(TableNames.SYS_USER, 'withdrawal_status', {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '是否可以提现：0否，1是',
      });
    }

    if (!tableInfo.temp_withdraw_status) {
      await queryInterface.addColumn(TableNames.SYS_USER, 'temp_withdraw_status', {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '临时提现状态：0关闭，1开启',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(TableNames.SYS_USER, 'user_withdraw_password');
    await queryInterface.removeColumn(TableNames.SYS_USER, 'withdrawal_status');
    await queryInterface.removeColumn(TableNames.SYS_USER, 'temp_withdraw_status');
  },
};
