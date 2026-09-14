'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { BIGINT, STRING, TINYINT, DATE, INTEGER } = Sequelize;
    await queryInterface.createTable('sys_h5_service', {
      id: {
        type: BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键自增',
      },
      service_name: {
        type: STRING(128),
        allowNull: false,
        comment: '客服昵称/名称',
      },
      avatar: {
        type: STRING(512),
        allowNull: true,
        comment: '客服头像图片地址',
      },
      contact_type: {
        type: TINYINT,
        allowNull: false,
        comment: '1-微信，2-QQ，3-手机号',
      },
      contact_value: {
        type: STRING(512),
        allowNull: false,
        comment: '对应联系方式字符串',
      },
      jump_url: {
        type: STRING(512),
        allowNull: true,
        comment: '跳转地址',
      },
      sort: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '排序，数值越小越靠前',
      },
      status: {
        type: TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '0禁用，1启用',
      },
      remark: {
        type: STRING(500),
        allowNull: true,
        comment: '后台备注',
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
        comment: '软删除：0正常 1删除',
      },
    });

    // 索引
    try {
      await queryInterface.addIndex('sys_h5_service', [ 'status', 'sort', 'is_deleted' ], {
        name: 'idx_status_sort',
      });
    } catch (err) {
      console.log('索引创建报错（可能是已存在），忽略该错误');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sys_h5_service');
  },
};
