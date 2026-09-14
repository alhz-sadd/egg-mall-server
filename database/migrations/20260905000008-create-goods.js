'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { BIGINT, STRING, TINYINT, DATE, TEXT, DECIMAL, INTEGER } = Sequelize;
    await queryInterface.createTable('goods', {
      goods_id: {
        type: BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键自增',
      },
      goods_name: {
        type: STRING(255),
        allowNull: false,
        comment: '商品名称',
      },
      goods_no: {
        type: STRING(64),
        allowNull: false,
        comment: '商品编码，业务唯一编码',
      },
      goods_type: {
        type: TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '商品类型：1普通商品，2任务商品',
      },
      cover_image: {
        type: STRING(512),
        allowNull: true,
        comment: '商品主图',
      },
      images: {
        type: TEXT,
        allowNull: true,
        comment: '多张图JSON数组',
      },
      price: {
        type: DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: '商品价格',
      },
      stock: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '库存数量',
      },
      sales: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '销量',
      },
      content: {
        type: TEXT,
        allowNull: true,
        comment: '商品详情富文本',
      },
      sort: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '后台排序',
      },
      status: {
        type: TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '0下架，1上架',
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
        comment: '软删除 0正常 1删除',
      },
    });

    // 索引
    try {
      await queryInterface.addIndex('goods', [ 'goods_no', 'is_deleted' ], {
        name: 'uk_goods_no',
        unique: true,
      });
      await queryInterface.addIndex('goods', [ 'goods_type', 'status', 'is_deleted' ], {
        name: 'idx_goods_type_status',
      });
      await queryInterface.addIndex('goods', [ 'status', 'is_deleted' ], {
        name: 'idx_status',
      });
    } catch (err) {
      console.log('索引创建报错（可能是已存在），忽略该错误');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('goods');
  },
};
