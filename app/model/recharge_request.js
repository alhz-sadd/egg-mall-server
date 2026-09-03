'use strict';

module.exports = app => {
  const { INTEGER, DECIMAL, STRING } = app.Sequelize;

  const RechargeRequest = app.model.define('recharge_request', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '充值请求ID',
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
    do_money: {
      type: DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: '发生金额',
    },
    sys_get_money: {
      type: DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: '系统到账金额',
    },
    user_get_money: {
      type: DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: '用户到账金额',
    },
    sx_money: {
      type: DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: '手续费',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '状态：0充值中 1成功 2失败',
    },
    examine_type: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '审核类型：0用户自己充值 1代付',
    },
    pay_way: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '充值方式',
    },
    is_first: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '是否首充：0否 1是',
    },
    remark: {
      type: STRING(255),
      comment: '备注',
    },
  }, {
    tableName: 'recharge_requests',
    comment: '充值请求表',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  RechargeRequest.associate = function() {
    app.model.RechargeRequest.belongsTo(app.model.User, { foreignKey: 'user_id', as: 'user' });
  };

  return RechargeRequest;
};
