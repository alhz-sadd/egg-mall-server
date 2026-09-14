'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT } = app.Sequelize;

  const SalesRechargeAddress = app.model.define(TableNames.SALES_RECHARGE_ADDRESS, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    sales_user_id: {
      type: BIGINT,
      allowNull: false,
    },
    shop_id: {
      type: BIGINT,
      allowNull: false,
    },
    channel_code: {
      type: STRING(50),
      allowNull: true,
    },
    channel_name: {
      type: STRING(100),
      allowNull: true,
    },
    address: {
      type: STRING(255),
      allowNull: true,
    },
    qr_code: {
      type: STRING(255),
      allowNull: true,
    },
    remark: {
      type: STRING(255),
      allowNull: true,
    },
    is_enable: {
      type: TINYINT,
      allowNull: true,
      defaultValue: 1,
    },
    sort: {
      type: TINYINT,
      allowNull: true,
      defaultValue: 0,
    },
    is_deleted: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '软删除 0正常 1删除',
    },
  }, {
    tableName: TableNames.SALES_RECHARGE_ADDRESS,
    timestamps: true,
    createdAt: 'create_time',
    updatedAt: 'update_time',
  });

  SalesRechargeAddress.associate = function() {
    // 关联到业务员（SysUser）
    app.model.SalesRechargeAddress.belongsTo(app.model.SysUser, {
      foreignKey: 'sales_user_id',
      as: 'salesman',
    });
  };

  return SalesRechargeAddress;
};
