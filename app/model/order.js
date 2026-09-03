'use strict';

module.exports = app => {
  const { STRING, INTEGER, DECIMAL, DATE } = app.Sequelize;

  const Order = app.model.define('order', {
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
    order_no: {
      type: STRING(64),
      allowNull: false,
      unique: true,
      comment: '订单编号',
    },
    user_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '用户ID',
    },
    address_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '地址ID',
    },
    total_amount: {
      type: DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '商品总金额',
    },
    freight_amount: {
      type: DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '运费',
    },
    discount_amount: {
      type: DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '优惠金额',
    },
    pay_amount: {
      type: DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '应付金额',
    },
    static_commission: {
      type: DECIMAL(18, 8),
      allowNull: false,
      defaultValue: 0.00000000,
      comment: '静态佣金',
    },
    dynamic_commission: {
      type: DECIMAL(18, 8),
      allowNull: false,
      defaultValue: 0.00000000,
      comment: '动态佣金',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '状态：0待支付 1已支付 2已发货 3已完成 4已取消',
    },
    pay_time: {
      type: DATE,
      comment: '支付时间',
    },
    ship_time: {
      type: DATE,
      comment: '发货时间',
    },
    finish_time: {
      type: DATE,
      comment: '完成时间',
    },
    remark: {
      type: STRING(255),
      comment: '备注',
    },
  }, {
    tableName: 'orders',
    comment: '订单表',
  });

  Order.associate = function() {
    app.model.Order.belongsTo(app.model.User, { foreignKey: 'user_id', as: 'user' });
    app.model.Order.hasMany(app.model.OrderItem, { foreignKey: 'order_id', as: 'items' });
  };

  return Order;
};
