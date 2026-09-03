'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const LogisticsAddress = app.model.define('logistics_address', {
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
    name: {
      type: STRING(64),
      allowNull: false,
      comment: '姓名',
    },
    phone: {
      type: STRING(20),
      allowNull: false,
      comment: '联系方式',
    },
    address: {
      type: STRING(255),
      allowNull: false,
      comment: '地址',
    },
    is_default: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '是否默认：1是 0否',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1启用 0禁用',
    },
  }, {
    tableName: 'logistics_addresses',
    comment: '物流地址表',
  });

  LogisticsAddress.associate = function() {
    app.model.LogisticsAddress.belongsTo(app.model.User, { foreignKey: 'user_id', as: 'user' });
  };

  return LogisticsAddress;
};
