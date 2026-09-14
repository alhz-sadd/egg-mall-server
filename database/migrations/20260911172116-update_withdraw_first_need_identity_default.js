'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { TINYINT } = Sequelize;

    // 1. 修改字段默认值为 0
    await queryInterface.changeColumn('shop_config', 'withdraw_first_need_identity', {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '首次提现是否需要实名认证',
    });

    // 2. 将现有记录中该字段为 1 的记录更新为 0 (如果需要强制全局默认的话)
    // 根据用户要求“首提需实名 也是默认不开启”，通常意味着全局默认都应该关闭
    await queryInterface.bulkUpdate('shop_config', { withdraw_first_need_identity: 0 }, { withdraw_first_need_identity: 1 });
  },

  async down(queryInterface, Sequelize) {
    const { TINYINT } = Sequelize;
    await queryInterface.changeColumn('shop_config', 'withdraw_first_need_identity', {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '首次提现是否需要实名认证',
    });
  },
};
