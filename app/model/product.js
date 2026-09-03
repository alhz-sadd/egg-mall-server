'use strict';

module.exports = app => {
  const { STRING, INTEGER, DECIMAL, TEXT, JSON } = app.Sequelize;

  const Product = app.model.define('product', {
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
    type: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: '商品类型：1移动设备 2家电 3电脑设备 4体育 5时尚',
    },
    title: {
      type: STRING(128),
      allowNull: false,
      comment: '商品名称',
    },
    description: {
      type: TEXT,
      comment: '商品描述',
    },
    img: {
      type: STRING(255),
      comment: '缩略图地址',
    },
    images: {
      type: JSON,
      comment: '商品图片列表',
    },
    price: {
      type: DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '售价',
    },
    stock: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '库存',
    },
    sales: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '销量',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1上架 0下架',
    },
    sort: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '排序',
    },
    translations: {
      type: JSON,
      comment: '多语言翻译存储',
    },
  }, {
    tableName: 'products',
    comment: '商品表',
  });

  return Product;
};
