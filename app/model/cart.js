'use strict';

module.exports = app => {
  const { INTEGER } = app.Sequelize;

  const Cart = app.model.define('cart', {
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
    product_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '商品ID',
    },
    quantity: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: '数量',
    },
    selected: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '是否选中：1是 0否',
    },
  }, {
    tableName: 'carts',
    comment: '购物车表',
  });

  Cart.associate = function() {
    app.model.Cart.belongsTo(app.model.User, { foreignKey: 'user_id', as: 'user' });
    app.model.Cart.belongsTo(app.model.Product, { foreignKey: 'product_id', as: 'product' });
  };

  return Cart;
};

