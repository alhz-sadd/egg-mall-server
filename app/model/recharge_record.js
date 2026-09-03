'use strict';

module.exports = app => {
  const { INTEGER, DECIMAL, DATEONLY, STRING } = app.Sequelize;

  const RechargeRecord = app.model.define('recharge_record', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: 'ID',
    },
    admin_id: {
      type: INTEGER.UNSIGNED,
      comment: '店铺管理员ID',
    },
    user_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '用户ID',
    },
    operator_id: {
      type: INTEGER.UNSIGNED,
      comment: '业务员/操作员ID',
    },
    operation_type: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '操作类型：0赠送客户 1员工添加 2第三方充值',
    },
    amount: {
      type: DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '操作金额',
    },
    order_id: {
      type: INTEGER.UNSIGNED,
      comment: '订单ID',
    },
    order_num: {
      type: STRING(64),
      comment: '订单号',
    },
    recharge_type: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '充值类型：1首充 2复充',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '状态：0待审核 1通过 2拒绝',
    },
    recharge_date: {
      type: DATEONLY,
      allowNull: false,
      comment: '充值日期',
    },
    remark: {
      type: STRING(255),
      comment: '备注',
    },
  }, {
    tableName: 'recharge_records',
    comment: '上分明细表',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  RechargeRecord.associate = function() {
    app.model.RechargeRecord.belongsTo(app.model.User, { foreignKey: 'user_id', as: 'user' });
  };

  return RechargeRecord;
};
