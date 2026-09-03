'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const Banner = app.model.define('banner', {
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
    title: {
      type: STRING(128),
      comment: '轮播标题',
    },
    image: {
      type: STRING(255),
      allowNull: false,
      comment: '图片地址',
    },
    link: {
      type: STRING(255),
      comment: '跳转链接',
    },
    sort: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '排序，数值越大越靠前',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1启用 0禁用',
    },
  }, {
    tableName: 'banners',
    comment: '轮播图表',
  });

  return Banner;
};
