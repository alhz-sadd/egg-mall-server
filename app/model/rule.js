'use strict';

/**
 * 规则模型
 * 全站仅维护一条规则记录，使用图片数组展示
 * @param app
 */
module.exports = app => {
  const { INTEGER, JSON: JSON_TYPE } = app.Sequelize;

  const Rule = app.model.define('rule', {
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
    images: {
      type: JSON_TYPE,
      allowNull: false,
      defaultValue: [],
      comment: '规则图片数组',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1启用 0禁用',
    },
  }, {
    tableName: 'rules',
    comment: '规则表',
  });

  return Rule;
};
