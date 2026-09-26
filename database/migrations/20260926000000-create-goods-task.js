'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { BIGINT, STRING, TINYINT, DATE, TEXT, DECIMAL } = Sequelize;
    await queryInterface.createTable('goods_task', {
      id: {
        type: BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键自增',
      },
      goods_name: {
        type: STRING(255),
        allowNull: false,
        defaultValue: '',
        comment: '商品名称',
      },
      goods_price: {
        type: DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: '商品价格',
      },
      goods_images: {
        type: TEXT,
        allowNull: true,
        comment: '多张图JSON数组',
      },
      status: {
        type: TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '0下架/禁用，1上架/启用',
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
      await queryInterface.addIndex('goods_task', [ 'status', 'is_deleted' ], {
        name: 'idx_goods_task_status',
      });
    } catch (err) {
      console.log('索引创建报错（可能是已存在），忽略该错误');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('goods_task');
  },
};
