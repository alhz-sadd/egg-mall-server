'use strict';

/**
 * 公告模型
 * @param app
 */
module.exports = app => {
  const { INTEGER, STRING, TEXT } = app.Sequelize;

  const Notice = app.model.define('notice', {
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
      allowNull: false,
      comment: '公告标题',
    },
    content: {
      type: TEXT,
      allowNull: false,
      comment: '公告内容',
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
    tableName: 'notices',
    comment: '公告表',
  });

  return Notice;
};
