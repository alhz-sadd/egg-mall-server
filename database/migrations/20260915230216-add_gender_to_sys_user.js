'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sys_user', 'gender', {
      type: Sequelize.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '性别：0未知，1男，2女',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sys_user', 'gender');
  }
};
