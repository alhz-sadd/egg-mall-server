'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING, BIGINT, TINYINT, DATE, INTEGER } = Sequelize;

    // 强制清理可能残留的表
    await queryInterface.dropTable('sys_role').catch(() => {});

    await queryInterface.createTable('sys_role', {
      role_id: {
        type: BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键',
      },
      role_name: {
        type: STRING(64),
        allowNull: false,
        comment: '角色名称：平台管理员、店家角色、业务员角色',
      },
      role_code: {
        type: STRING(64),
        allowNull: false,
        comment: '角色编码，唯一，如：platform_admin、shop_admin、shop_salesman',
      },
      sort: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '排序',
      },
      remark: {
        type: STRING(500),
        allowNull: true,
        comment: '备注',
      },
      create_user_id: {
        type: BIGINT,
        allowNull: true,
        comment: '创建人ID',
      },
      update_user_id: {
        type: BIGINT,
        allowNull: true,
        comment: '修改人ID',
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
        comment: '软删除：0正常，1删除',
      },
    });

    await queryInterface.addIndex('sys_role', [ 'role_code', 'is_deleted' ], {
      unique: true,
      name: 'uk_sys_role_code',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sys_role');
  },
};
