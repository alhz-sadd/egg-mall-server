'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sys_oper_log', 'target_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: '被操作人员ID',
    });
    await queryInterface.addColumn('sys_oper_log', 'target_name', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: '被操作人员昵称',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sys_oper_log', 'target_id');
    await queryInterface.removeColumn('sys_oper_log', 'target_name');
  }
};
