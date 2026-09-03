'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admin_inner_users', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: '内部ID（主键）',
      },
      username: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
        comment: '登录账号',
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: '加密密码',
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: '状态：1启用 0禁用',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    }, {
      comment: '内部管理员表(admin-inner)',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('admin_inner_users');
  },
};
