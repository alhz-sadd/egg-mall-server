'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DECIMAL, TINYINT } = Sequelize;

    // 1. 添加字段
    await queryInterface.addColumn('shop_config', 'withdraw_max_amount', {
      type: DECIMAL(16, 2),
      allowNull: false,
      defaultValue: 99999.00,
      comment: '提现最大金额',
    });

    await queryInterface.addColumn('shop_config', 'recharge_fee_rate', {
      type: DECIMAL(16, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: '充值手续费比例',
    });

    // 2. 修改已有字段的默认值 (注意：changeColumn 在某些数据库引擎下可能不生效默认值，这里显式更新已有记录)
    await queryInterface.changeColumn('shop_config', 'order_pay_timeout_switch', {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '订单支付超时开关：0关闭 1开启',
    });

    await queryInterface.changeColumn('shop_config', 'withdraw_fee_value', {
      type: DECIMAL(16, 2),
      allowNull: false,
      defaultValue: 0.03,
      comment: '提现手续费值',
    });

    await queryInterface.changeColumn('shop_config', 'real_name_reward', {
      type: DECIMAL(16, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '实名奖励金额',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('shop_config', 'withdraw_max_amount');
    await queryInterface.removeColumn('shop_config', 'recharge_fee_rate');
  },
};
