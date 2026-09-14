'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DATE, INTEGER } = app.Sequelize;

  const GoodsCategory = app.model.define(TableNames.GOODS_CATEGORY, {
    category_id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键自增',
    },
    category_name: {
      type: STRING(128),
      allowNull: false,
      comment: '分类名称',
    },
    category_code: {
      type: STRING(64),
      allowNull: false,
      comment: '编码，唯一',
    },
    sort: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序，数字越小越靠前',
    },
    status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '0禁用，1启用',
    },
    remark: {
      type: STRING(500),
      allowNull: true,
      comment: '备注',
    },
    create_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '平台管理员ID',
    },
    update_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '更新人ID',
    },
    create_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '创建时间',
    },
    update_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '更新时间',
    },
    is_deleted: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '软删除 0/1',
    },
  }, {
    tableName: 'goods_category',
    timestamps: false,
    underscored: false,
  });

  GoodsCategory.associate = () => {
    app.model.GoodsCategory.hasMany(app.model.Goods, { foreignKey: 'category_id', as: 'goods' });
  };

  return GoodsCategory;
};
