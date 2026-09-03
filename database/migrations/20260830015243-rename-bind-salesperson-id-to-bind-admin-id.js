'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.renameColumn('admin_users', 'bind_salesperson_id', 'bind_admin_id');
  },

  async down(queryInterface) {
    await queryInterface.renameColumn('admin_users', 'bind_admin_id', 'bind_salesperson_id');
  },
};
