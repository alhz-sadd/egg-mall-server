'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('goods_category', {
      category_id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: '主键自增',
      },
      category_name: {
        type: Sequelize.STRING(128),
        allowNull: false,
        comment: '分类名称',
      },
      category_code: {
        type: Sequelize.STRING(64),
        allowNull: false,
        comment: '编码，唯一',
      },
      sort: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '排序，数字越小越靠前',
      },
      status: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '0禁用，1启用',
      },
      remark: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: '备注',
      },
      create_user_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: '平台管理员ID',
      },
      update_user_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: '更新人ID',
      },
      create_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '创建时间',
      },
      update_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        comment: '更新时间',
      },
      is_deleted: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: '软删除 0/1',
      },
    }, {
      comment: '商品分类表',
    });

    // 索引：unique uk_category_code(category_code,is_deleted)
    try {
      await queryInterface.addIndex('goods_category', [ 'category_code', 'is_deleted' ], {
        unique: true,
        name: 'uk_category_code',
      });

      // 索引：idx_status_sort(status,sort,is_deleted)
      await queryInterface.addIndex('goods_category', [ 'status', 'sort', 'is_deleted' ], {
        name: 'idx_status_sort',
      });

      // 初始化预置5条基础数据
      await queryInterface.bulkInsert('goods_category', [
        { category_name: '移动', category_code: '1', sort: 1, status: 1, is_deleted: 0, create_time: new Date(), update_time: new Date() },
        { category_name: '家电', category_code: '2', sort: 2, status: 1, is_deleted: 0, create_time: new Date(), update_time: new Date() },
        { category_name: '电脑', category_code: '3', sort: 3, status: 1, is_deleted: 0, create_time: new Date(), update_time: new Date() },
        { category_name: '体育', category_code: '4', sort: 4, status: 1, is_deleted: 0, create_time: new Date(), update_time: new Date() },
        { category_name: '时尚', category_code: '5', sort: 5, status: 1, is_deleted: 0, create_time: new Date(), update_time: new Date() },
      ]);
    } catch (err) {
      console.log('索引或数据已存在，忽略该错误');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('goods_category');
  },
};
