'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING, BIGINT, TINYINT, DATE } = Sequelize;

    await queryInterface.createTable('shop_h5_binding', {
      id: {
        type: BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键 自增',
      },
      shop_id: {
        type: BIGINT,
        allowNull: false,
        comment: '关联的店铺ID',
      },
      h5_url: {
        type: STRING(255),
        allowNull: false,
        comment: '绑定的URL',
      },
      type: {
        type: STRING(50),
        allowNull: false,
        defaultValue: 'h5',
        comment: '类型：h5/admin',
      },
      status: {
        type: TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '状态：0禁用，1启用',
      },
      remark: {
        type: STRING(500),
        allowNull: true,
        comment: '备注说明',
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        comment: '更新时间',
      },
      is_deleted: {
        type: TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: '软删除：0正常，1删除',
      },
    });

    await queryInterface.addIndex('shop_h5_binding', [ 'shop_id', 'is_deleted' ], {
      name: 'idx_shop_h5_binding_shop_id',
    });
    await queryInterface.addIndex('shop_h5_binding', [ 'h5_url', 'is_deleted' ], {
      name: 'idx_shop_h5_binding_url',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('shop_h5_binding');
  },
};
