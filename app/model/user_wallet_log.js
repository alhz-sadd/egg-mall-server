'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, DECIMAL, DATE, TINYINT, STRING } = app.Sequelize;

  const UserWalletLog = app.model.define(TableNames.USER_WALLET_LOG, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: BIGINT,
      allowNull: false,
      comment: 'C用户ID',
    },
    log_no: {
      type: STRING(64),
      allowNull: false,
      unique: true,
      comment: '流水编号',
    },
    biz_type: {
      type: TINYINT,
      allowNull: false,
      comment: '业务类型：1充值 2提现申请 3提现驳回退回 4静态收益发放 5动态收益发放 6资产扣减 7其他',
    },
    amount: {
      type: DECIMAL(18, 2),
      allowNull: false,
      comment: '变动金额；正数增加，负数扣减',
    },
    balance_type: {
      type: TINYINT,
      allowNull: false,
      comment: '1=赠送客户, 2=员工添加, 3=通道充值',
    },
    before_balance: {
      type: DECIMAL(18, 2),
      allowNull: false,
      comment: '变动前余额',
    },
    after_balance: {
      type: DECIMAL(18, 2),
      allowNull: false,
      comment: '变动后余额',
    },
    related_order_id: {
      type: BIGINT,
      allowNull: true,
      comment: '关联订单ID，充值/提现订单id',
    },
    from_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '来源用户ID(如下级)',
    },
    operator_id: {
      type: BIGINT,
      allowNull: true,
      comment: '操作人ID(如后台管理员/店长/业务员等)',
    },
    remark: {
      type: STRING(512),
      allowNull: true,
      comment: '备注说明',
    },
    create_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  }, {
    tableName: 'user_wallet_log',
    comment: '钱包资金变动流水记录',
    timestamps: false,
    indexes: [
      {
        unique: true,
        name: 'uk_log_no',
        fields: [ 'log_no' ],
      },
      {
        name: 'idx_user_id',
        fields: [ 'user_id' ],
      },
      {
        name: 'idx_biz_type',
        fields: [ 'biz_type' ],
      },
      {
        name: 'idx_create_time',
        fields: [ 'create_time' ],
      },
    ],
  });

  UserWalletLog.associate = () => {
    app.model.UserWalletLog.belongsTo(app.model.SysUser, { foreignKey: 'user_id', as: 'user' });
    app.model.UserWalletLog.belongsTo(app.model.SysUser, { foreignKey: 'operator_id', as: 'operator' });
  };

  return UserWalletLog;
};
