'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('sys_user', 'totp_secret', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'TOTP底层密钥，生成二维码、校验验证码靠它，只存后端，不给前端',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('sys_user', 'totp_secret', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: 'TOTP底层密钥，生成二维码、校验验证码靠它，只存后端，不给前端',
    });
  }
};
