'use strict';

module.exports = app => {
  const { INTEGER, STRING } = app.Sequelize;

  const WithdrawWay = app.model.define('withdraw_way', {
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
    way: {
      type: STRING(64),
      allowNull: false,
      comment: '提现方式名称',
    },
    sort: {
      type: INTEGER.UNSIGNED,
      defaultValue: 0,
      comment: '排序，数字越小越靠前',
    },
    remark: {
      type: STRING(255),
      comment: '备注',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '状态：0启用 1禁用',
    },
    created_by: {
      type: STRING(64),
      comment: '添加人',
    },
  }, {
    tableName: 'withdraw_ways',
    comment: '提现方式表',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return WithdrawWay;
};
