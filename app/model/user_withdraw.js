'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, STRING, DECIMAL, TINYINT, DATE } = app.Sequelize;

  const UserWithdraw = app.model.define(TableNames.USER_WITHDRAW, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键ID',
    },
    order_no: {
      type: STRING(64),
      allowNull: false,
      comment: '提现订单号，唯一',
    },
    shop_id: {
      type: BIGINT,
      allowNull: false,
      comment: '所属店铺ID',
    },
    user_id: {
      type: BIGINT,
      allowNull: false,
      comment: 'C端用户ID，关联sys_user.id',
    },
    channel_code: {
      type: STRING(64),
      allowNull: false,
      comment: '提现渠道编码 usdt_trc20 / usdt_erc20',
    },
    channel_name: {
      type: STRING(128),
      allowNull: false,
      comment: '提现渠道名称',
    },
    withdraw_address: {
      type: STRING(255),
      allowNull: false,
      comment: '用户填写的提现钱包地址',
    },
    amount: {
      type: DECIMAL(18, 6),
      allowNull: false,
      comment: '用户申请提现金额（钱包扣减金额）',
    },
    fee: {
      type: DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0,
      comment: '提现手续费',
    },
    actual_receive_amount: {
      type: DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0,
      comment: '用户链上实际收到金额 = amount - fee',
    },
    status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '订单状态：1待审核，2审核通过，3审核驳回，4已取消',
    },
    audit_type: {
      type: TINYINT,
      allowNull: true,
      comment: '审核类型：1真实提现，2虚拟提现',
    },
    audit_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '审核人ID（B端操作人sys_user.id）',
    },
    sales_user_id: {
      type: BIGINT,
      allowNull: false,
      comment: '归属业务员ID',
    },
    audit_time: {
      type: DATE,
      allowNull: true,
      comment: '审核时间',
    },
    reject_reason: {
      type: STRING(500),
      allowNull: true,
      comment: '驳回原因',
    },
    remark: {
      type: STRING(500),
      allowNull: true,
      comment: '备注',
    },
    create_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '创建时间',
    },
    update_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '更新时间',
    },
  }, {
    tableName: 'user_withdraw',
    comment: '用户提现订单表',
    timestamps: false,
    indexes: [
      { name: 'idx_shop_id', fields: [ 'shop_id' ] },
      { name: 'idx_user_id', fields: [ 'user_id' ] },
      { unique: true, name: 'idx_order_no', fields: [ 'order_no' ] },
    ],
  });

  UserWithdraw.associate = () => {
    app.model.UserWithdraw.belongsTo(app.model.SysUser, { foreignKey: 'user_id', as: 'user' });
    app.model.UserWithdraw.belongsTo(app.model.SysUser, { foreignKey: 'sales_user_id', as: 'sales_user' });
    app.model.UserWithdraw.belongsTo(app.model.SysUser, { foreignKey: 'audit_user_id', as: 'audit_operator' });
    app.model.UserWithdraw.belongsTo(app.model.Shop, { foreignKey: 'shop_id', as: 'shop' });
  };

  return UserWithdraw;
};
