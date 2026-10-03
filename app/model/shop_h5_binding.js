'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DATE } = app.Sequelize;

  const ShopH5Binding = app.model.define(TableNames.SHOP_H5_BINDING, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键 自增',
    },
    shop_id: {
      type: BIGINT,
      allowNull: false,
      comment: '关联的店铺ID',
    },
    h5_url: {
      type: STRING(255),
      allowNull: false,
      comment: '绑定的H5 URL',
    },
    status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：0禁用，1启用',
    },
    remark: {
      type: STRING(500),
      allowNull: true,
      comment: '备注说明',
    },
    create_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '创建人ID',
    },
    update_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '修改人ID',
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
      comment: '软删除：0正常，1删除',
    },
  }, {
    tableName: 'shop_h5_binding',
    comment: '店铺H5域名绑定表',
    timestamps: false,
    underscored: false,
    indexes: [
      {
        name: 'idx_shop_h5_binding_shop_id',
        fields: [ 'shop_id', 'is_deleted' ],
      },
      {
        name: 'idx_shop_h5_binding_url',
        fields: [ 'h5_url', 'is_deleted' ],
      },
    ],
  });

  ShopH5Binding.associate = () => {
    app.model.ShopH5Binding.belongsTo(app.model.Shop, { foreignKey: 'shop_id', as: 'shop' });
    app.model.Shop.hasMany(app.model.ShopH5Binding, { foreignKey: 'shop_id', as: 'h5_bindings' });
  };

  return ShopH5Binding;
};
