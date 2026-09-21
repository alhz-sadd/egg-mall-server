'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, DECIMAL, TINYINT, INTEGER, DATE } = app.Sequelize;

  const ShopConfig = app.model.define(TableNames.SHOP_CONFIG, {
    config_id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    shop_id: {
      type: BIGINT,
      allowNull: false,
      unique: true,
      comment: '关联 shop.shop_id',
    },
    real_name_reward: {
      type: DECIMAL(16, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '实名奖励金额',
    },
    order_pay_timeout_switch: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '订单支付超时开关：0关闭 1开启',
    },
    order_pay_timeout: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1800,
      comment: '订单支付超时时间',
    },
    withdraw_min_amount: {
      type: DECIMAL(16, 2),
      allowNull: false,
      defaultValue: 100.00,
      comment: '提现最小金额',
    },
    withdraw_max_amount: {
      type: DECIMAL(16, 2),
      allowNull: false,
      defaultValue: 99999.00,
      comment: '提现最大金额',
    },
    withdraw_fee_type: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '提现手续费类型',
    },
    withdraw_fee_value: {
      type: DECIMAL(16, 2),
      allowNull: false,
      defaultValue: 0.03,
      comment: '提现手续费值',
    },
    recharge_fee_rate: {
      type: DECIMAL(16, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: '充值手续费比例',
    },
    withdraw_first_need_task: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '首次提现是否需要完成任务',
    },
    withdraw_first_need_identity: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '首次提现是否需要实名认证',
    },
    invite_new_user_reward: {
      type: DECIMAL(16, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '邀请新用户奖励',
    },
    operate_password: {
      type: app.Sequelize.STRING(64),
      allowNull: false,
      defaultValue: '123456',
      comment: '操作密码',
    },
    create_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    update_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  }, {
    tableName: 'shop_config',
    timestamps: false,
    underscored: false,
  });

  ShopConfig.associate = () => {
    app.model.ShopConfig.belongsTo(app.model.Shop, { foreignKey: 'shop_id', as: 'shop' });
  };

  return ShopConfig;
};
