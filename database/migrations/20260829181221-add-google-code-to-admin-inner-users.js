'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('admin_inner_users', 'google_code', {
      type: Sequelize.STRING(64),
      comment: '谷歌验证码（二级密码）',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('admin_inner_users', 'google_code');
  },
};
