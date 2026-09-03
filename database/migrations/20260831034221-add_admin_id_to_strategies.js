'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('strategies', 'admin_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '关联的店铺(管理员)ID',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('strategies', 'admin_id');
  },
};
