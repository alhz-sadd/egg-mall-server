'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 尝试添加联合索引，加上错误捕获防止因为索引已存在导致迁移报错中断
    try {
      await queryInterface.addIndex('shop_task_user', [ 'user_id', 'status' ], {
        name: 'idx_user_id_status',
      });
      console.log('✅ 索引 idx_user_id_status 创建成功');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate key name')) {
        console.log('⚠️ 索引 idx_user_id_status 已存在，跳过创建');
      } else {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeIndex('shop_task_user', 'idx_user_id_status');
    } catch (error) {
      console.log('删除索引失败，可能不存在:', error.message);
    }
  },
};
