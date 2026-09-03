'use strict';

module.exports = app => {
  const { INTEGER, DECIMAL, STRING } = app.Sequelize;

  const WithdrawRecord = app.model.define('withdraw_record', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '提现记录ID',
    },
    user_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '用户ID',
    },
    admin_id: {
      type: INTEGER.UNSIGNED,
      comment: '业务员ID',
    },
    admin_name: {
      type: STRING(64),
      comment: '业务员名称',
    },
    order_num: {
      type: STRING(64),
      allowNull: false,
      comment: '订单号',
    },
    address: {
      type: STRING(255),
      comment: '提现地址',
    },
    amount: {
      type: DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '提现金额',
    },
    sx_money: {
      type: DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: '手续费',
    },
    take_money: {
      type: DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: '用户到账金额',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '状态：0提现中 1提现成功 2提现失败',
    },
    way: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '提现方式',
    },
    examine_status: {
      type: INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: '检查类型：0真实提现 1虚拟提现',
    },
    country: {
      type: STRING(64),
      comment: '国家/地区',
    },
    is_show_address: {
      type: INTEGER,
      defaultValue: 0,
      comment: '是否显示地址：0否 1是',
    },
    remark: {
      type: STRING(255),
      comment: '备注',
    },
  }, {
    tableName: 'withdraw_records',
    comment: '提现记录表',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  WithdrawRecord.associate = function() {
    app.model.WithdrawRecord.belongsTo(app.model.User, { foreignKey: 'user_id', as: 'user' });
  };

  return WithdrawRecord;
};
