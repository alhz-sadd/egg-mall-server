'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, DATE, TINYINT } = app.Sequelize;

  const CustomerRelation = app.model.define(TableNames.CUSTOMER_RELATION, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    c_user_id: {
      type: BIGINT,
      allowNull: false,
      comment: 'C端用户id(sys_user.user_id type=4)',
    },
    parent_customer_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '直接上级C用户ID',
    },
    salesman_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '业务员账号id(sys_user.user_id type=3)',
    },
    shop_id: {
      type: BIGINT,
      allowNull: false,
      comment: '店铺id shop.shop_id',
    },
    root_salesman_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '源头业务员ID',
    },
    root_shop_id: {
      type: BIGINT,
      allowNull: true,
      comment: '源头业务员所属店铺ID',
    },
    operator_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '操作人账号id',
    },
    bind_type: {
      type: TINYINT,
      allowNull: false,
      comment: '绑定来源1业务员开户 2平台分配 3扫码 4后台分配',
    },
    status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '1有效，2解绑',
    },
    bind_time: {
      type: DATE,
      allowNull: true,
      comment: '绑定时间',
    },
    unbind_time: {
      type: DATE,
      allowNull: true,
      comment: '解绑时间',
    },
    remark: {
      type: app.Sequelize.STRING(500),
      allowNull: true,
      comment: '备注',
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
    is_deleted: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'customer_relation',
    timestamps: false,
    indexes: [
      { name: 'idx_c_user_id', fields: [ 'c_user_id' ] },
      { name: 'idx_shop_id', fields: [ 'shop_id' ] },
      { name: 'idx_salesman_user_id', fields: [ 'salesman_user_id' ] },
    ],
  });

  CustomerRelation.associate = () => {
    app.model.CustomerRelation.belongsTo(app.model.SysUser, { foreignKey: 'c_user_id', as: 'customer' });
    app.model.CustomerRelation.belongsTo(app.model.Shop, { foreignKey: 'shop_id', as: 'shop' });
  };

  return CustomerRelation;
};
