'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const Address = app.model.define('address', {
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
    receiver: {
      type: STRING(64),
      allowNull: false,
      comment: '收件人',
    },
    phone: {
      type: STRING(20),
      allowNull: false,
      comment: '手机号',
    },
    province: {
      type: STRING(64),
      allowNull: false,
      comment: '省',
    },
    city: {
      type: STRING(64),
      allowNull: false,
      comment: '市',
    },
    district: {
      type: STRING(64),
      allowNull: false,
      comment: '区/县',
    },
    detail: {
      type: STRING(255),
      allowNull: false,
      comment: '详细地址',
    },
    is_default: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '是否默认：1是 0否',
    },
  }, {
    tableName: 'addresses',
    comment: '收货地址表',
  });

  Address.associate = function() {
    app.model.Address.belongsTo(app.model.User, { foreignKey: 'user_id', as: 'user' });
  };

  return Address;
};

