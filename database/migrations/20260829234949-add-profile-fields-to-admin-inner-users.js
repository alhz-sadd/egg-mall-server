'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('admin_inner_users', 'nickname', {
      type: Sequelize.STRING(64),
      comment: '昵称/用户昵称',
    });
    await queryInterface.addColumn('admin_inner_users', 'gender', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      comment: '性别：0未知 1男 2女',
    });
    await queryInterface.addColumn('admin_inner_users', 'phone', {
      type: Sequelize.STRING(20),
      comment: '手机号',
    });
    await queryInterface.addColumn('admin_inner_users', 'email', {
      type: Sequelize.STRING(128),
      comment: '邮箱',
    });
    await queryInterface.addColumn('admin_inner_users', 'remark', {
      type: Sequelize.STRING(255),
      comment: '备注',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('admin_inner_users', 'nickname');
    await queryInterface.removeColumn('admin_inner_users', 'gender');
    await queryInterface.removeColumn('admin_inner_users', 'phone');
    await queryInterface.removeColumn('admin_inner_users', 'email');
    await queryInterface.removeColumn('admin_inner_users', 'remark');
  },
};
