'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sys_user', 'withdraw_ticket', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '提现门票数量，完成一次自身任务+1，提现/下级产生收益/绑定新任务作废清零',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sys_user', 'withdraw_ticket');
  },
};
