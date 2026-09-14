'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { BIGINT, STRING, TINYINT, DATE } = Sequelize;
    await queryInterface.createTable('sys_salesman_config', {
      id: {
        type: BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键自增',
      },
      salesman_user_id: {
        type: BIGINT,
        allowNull: false,
        comment: '业务员ID，关联 sys_user.user_id',
      },
      address_type: {
        type: TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '地址类型：1-默认充值地址',
      },
      recharge_address: {
        type: STRING(512),
        allowNull: false,
        comment: '充值地址字符串',
      },
      remark: {
        type: STRING(500),
        allowNull: true,
        comment: '备注',
      },
      is_default: {
        type: TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: '是否默认地址：1默认，0普通',
      },
      create_time: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '创建时间',
      },
      update_time: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '更新时间',
      },
      is_deleted: {
        type: TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: '软删除 0正常 1删除',
      },
    });

    // 索引
    try {
      await queryInterface.addIndex('sys_salesman_config', [ 'salesman_user_id', 'is_deleted' ], {
        name: 'idx_salesman_user_id',
      });
    } catch (err) {
      console.log('索引 idx_salesman_user_id 已存在，忽略该错误');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sys_salesman_config');
  },
};
