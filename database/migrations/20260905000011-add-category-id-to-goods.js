'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // 追加 category_id 字段
      await queryInterface.addColumn('goods', 'category_id', {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: '关联 goods_category.category_id',
      });

      // 添加索引 idx_category_id(category_id, is_deleted)
      await queryInterface.addIndex('goods', [ 'category_id', 'is_deleted' ], {
        name: 'idx_category_id',
      });
    } catch (err) {
      console.log('字段或索引已存在，忽略该错误');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('goods', 'idx_category_id');
    await queryInterface.removeColumn('goods', 'category_id');
  },
};
