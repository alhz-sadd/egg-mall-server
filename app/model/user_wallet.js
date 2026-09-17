'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, DECIMAL, DATE } = app.Sequelize;

  const UserWallet = app.model.define(TableNames.USER_WALLET, {
    wallet_id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键',
    },
    user_id: {
      type: BIGINT,
      allowNull: false,
      unique: true,
      comment: '关联 sys_user.user_id，唯一索引，一个用户1条钱包',
    },
    balance: {
      type: DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '总可用余额 (等于 voucher_balance + recharge_balance)',
    },
    recharge_balance: {
      type: DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '充值金额',
    },
    voucher_balance: {
      type: DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '代金资产余额',
    },
    freeze_voucher_balance: {
      type: DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '冻结代金资产余额',
    },
    freeze_static_income: {
      type: DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '冻结静态收益',
    },
    freeze_dynamic_income: {
      type: DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '冻结动态收益',
    },
    static_income: {
      type: DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '静态收益余额',
    },
    dynamic_income: {
      type: DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '动态收益余额',
    },
    total_recharge_amount: {
      type: DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '累计充值金额',
    },
    total_withdraw_amount: {
      type: DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '累计提现金额',
    },
    total_invite_income: {
      type: DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '累计邀请下级总收入',
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
    tableName: 'user_wallet',
    comment: '用户钱包表',
    timestamps: false,
    underscored: false,
  });

  UserWallet.associate = () => {
    app.model.UserWallet.belongsTo(app.model.SysUser, { foreignKey: 'user_id', as: 'user' });
  };

  return UserWallet;
};
