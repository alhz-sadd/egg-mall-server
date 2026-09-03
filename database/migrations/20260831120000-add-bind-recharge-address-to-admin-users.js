'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING } = Sequelize;
    await queryInterface.addColumn('admin_users', 'bindRechargeaddress', {
      type: STRING(255),
      defaultValue: null,
      allowNull: true,
      comment: '绑定充值地址',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('admin_users', 'bind_rechargeaddress');
  },
};
