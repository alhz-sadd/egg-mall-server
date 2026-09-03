'use strict';

/**
 * 客服模型
 * @param app
 */
module.exports = app => {
  const { INTEGER, STRING } = app.Sequelize;

  const CustomerService = app.model.define('customer_service', {
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
    name: {
      type: STRING(100),
      allowNull: false,
      comment: '客服名称',
    },
    avatar: {
      type: STRING(500),
      allowNull: true,
      defaultValue: '',
      comment: '客服头像',
    },
    link: {
      type: STRING(500),
      allowNull: true,
      defaultValue: '',
      comment: '跳转地址',
    },
    contact: {
      type: STRING(200),
      allowNull: true,
      defaultValue: '',
      comment: '联系人',
    },
    sort: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序，值越大越靠前',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1启用 0禁用',
    },
  }, {
    tableName: 'customer_services',
    comment: '客服表',
  });

  return CustomerService;
};
