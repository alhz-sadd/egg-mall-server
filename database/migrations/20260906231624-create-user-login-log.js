'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_login_log', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: '自增主键',
      },
      log_no: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: 'uk_log_no',
        comment: '登录日志业务编号，对外溯源展示',
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: '关联sys_user.id',
      },
      username: {
        type: Sequelize.STRING(64),
        comment: '账号冗余保存',
      },
      login_ip: {
        type: Sequelize.STRING(64),
        comment: '登录原始IP地址',
      },
      login_location: {
        type: Sequelize.STRING(128),
        allowNull: true,
        comment: 'IP解析地理位置，程序解析后存入，解析失败为NULL',
      },
      user_agent: {
        type: Sequelize.TEXT,
        comment: '原始UA完整字符串',
      },
      device_type: {
        type: Sequelize.TINYINT,
        allowNull: true,
        comment: '设备类型：1 PC电脑 2安卓 3 iOS苹果 4其他设备',
      },
      browser: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: '浏览器名称：Chrome / Edge / Safari / 微信内置浏览器等',
      },
      os: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: '操作系统：Windows11、MacOS、Android14、iOS18',
      },
      login_type: {
        type: Sequelize.TINYINT,
        allowNull: false,
        comment: '1:A平台端 2:B店铺后台 3:C端H5',
      },
      login_result: {
        type: Sequelize.TINYINT,
        allowNull: false,
        comment: '0登录失败 1登录成功',
      },
      login_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '登录发生时间',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: '全端用户登录日志',
    });

    await queryInterface.addIndex('user_login_log', [ 'user_id' ], { name: 'idx_user_id' });
    await queryInterface.addIndex('user_login_log', [ 'login_type' ], { name: 'idx_login_type' });
    await queryInterface.addIndex('user_login_log', [ 'login_time' ], { name: 'idx_login_time' });
    await queryInterface.addIndex('user_login_log', [ 'device_type' ], { name: 'idx_device_type' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_login_log');
  },
};
