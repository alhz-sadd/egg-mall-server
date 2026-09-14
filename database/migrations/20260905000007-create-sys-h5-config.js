'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { BIGINT, STRING, TINYINT, DATE, TEXT, INTEGER } = Sequelize;
    await queryInterface.createTable('sys_h5_config', {
      id: {
        type: BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键自增',
      },
      config_type: {
        type: TINYINT,
        allowNull: false,
        comment: '类型：1-Banner, 2-公告, 3-规则管理, 4-首页商品, 5-任务商品',
      },
      title: {
        type: STRING(255),
        allowNull: false,
        comment: '标题：banner标题、公告标题、规则名称、商品显示名称',
      },
      cover_image: {
        type: STRING(512),
        allowNull: true,
        comment: '封面图；banner图、商品封面图；可为null',
      },
      content: {
        type: TEXT,
        allowNull: true,
        comment: '内容：公告正文、规则富文本内容',
      },
      extra: {
        type: TEXT,
        allowNull: true,
        comment: '扩展JSON字段',
      },
      sort: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '排序，数字越小越靠前',
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
      await queryInterface.addIndex('sys_h5_config', [ 'config_type', 'status', 'is_deleted' ], {
        name: 'idx_config_type_status',
      });
    } catch (err) {
      console.log('索引 idx_config_type_status 已存在，忽略该错误');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sys_h5_config');
  },
};
