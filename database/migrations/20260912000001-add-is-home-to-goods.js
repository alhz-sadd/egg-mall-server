'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('goods', 'is_home', {
      type: Sequelize.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '是否首页显示：0否 1是',
      after: 'status',
    });

    // 增加索引提高查询性能
    await queryInterface.addIndex('goods', [ 'is_home', 'status', 'is_deleted' ], {
      name: 'idx_is_home_status',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('goods', 'is_home');
  },
};
