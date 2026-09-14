'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, DECIMAL, TINYINT, DATE } = app.Sequelize;

  const UserCommissionLog = app.model.define(TableNames.USER_COMMISSION_LOG, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键',
    },
    user_id: {
      type: BIGINT,
      allowNull: false,
      comment: '受益业务员ID，sys_user.id',
    },
    sub_user_id: {
      type: BIGINT,
      allowNull: false,
      comment: '下级C端用户ID',
    },
    recharge_id: {
      type: BIGINT,
      allowNull: false,
      comment: '关联充值订单ID user_recharge.id',
    },
    origin_amount: {
      type: DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0.000000,
      comment: '下级这笔充值原始金额',
    },
    commission_amount: {
      type: DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0.000000,
      comment: '本次佣金金额',
    },
    rate: {
      type: DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0.0000,
      comment: '返佣比例，如0.03代表3%',
    },
    status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '1待结算 2已结算 3作废',
    },
    create_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '生成时间',
    },
    settle_time: {
      type: DATE,
      allowNull: true,
      comment: '结算时间',
    },
  }, {
    tableName: 'user_commission_log',
    comment: '业务员佣金明细表',
    timestamps: false,
    underscored: false,
    indexes: [
      {
        name: 'idx_user_id',
        fields: [ 'user_id' ],
      },
      {
        name: 'idx_sub_user_id',
        fields: [ 'sub_user_id' ],
      },
      {
        name: 'idx_recharge_id',
        fields: [ 'recharge_id' ],
      },
    ],
  });

  UserCommissionLog.associate = () => {
    app.model.UserCommissionLog.belongsTo(app.model.SysUser, { foreignKey: 'user_id', as: 'salesman' });
    app.model.UserCommissionLog.belongsTo(app.model.SysUser, { foreignKey: 'sub_user_id', as: 'subUser' });
    // app.model.UserCommissionLog.belongsTo(app.model.UserRecharge, { foreignKey: 'recharge_id', as: 'rechargeOrder' });
  };

  return UserCommissionLog;
};
