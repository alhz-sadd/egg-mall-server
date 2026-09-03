'use strict';

module.exports = app => {
  const { STRING, INTEGER, DECIMAL } = app.Sequelize;

  const OrderItem = app.model.define('order_item', {
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
    order_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '订单ID',
    },
    product_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '商品ID',
    },
    product_name: {
      type: STRING(128),
      allowNull: false,
      comment: '商品名称（快照）',
    },
    product_image: {
      type: STRING(255),
      comment: '商品图片（快照）',
    },
    price: {
      type: DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '下单单价',
    },
    quantity: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: '数量',
    },
    total_amount: {
      type: DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '小计金额',
    },
  }, {
    tableName: 'order_items',
    comment: '订单商品表',
  });

  OrderItem.associate = function() {
    app.model.OrderItem.belongsTo(app.model.Order, { foreignKey: 'order_id', as: 'order' });
    app.model.OrderItem.belongsTo(app.model.Product, { foreignKey: 'product_id', as: 'product' });
  };

  return OrderItem;
};

