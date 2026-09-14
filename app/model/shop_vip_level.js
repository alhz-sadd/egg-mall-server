'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DECIMAL, DATE, INTEGER, TEXT } = app.Sequelize;

  const ShopVipLevel = app.model.define(TableNames.SHOP_VIP_LEVEL, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    shop_id: {
      type: BIGINT,
      allowNull: false,
      comment: '所属店铺ID，0为A端模板',
    },
    level: {
      type: TINYINT,
      allowNull: false,
      comment: 'VIP等级数字',
    },
    level_name: {
      type: STRING(100),
      allowNull: false,
      comment: 'VIP等级名称',
    },
    need_total_recharge: {
      type: DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0.000000,
      comment: '升级所需累计充值金额',
    },
    benefit: {
      type: TEXT,
      allowNull: true,
      comment: '权益描述',
    },
    sort: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_enable: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '是否启用 1启用 0禁用',
    },
    create_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    update_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  }, {
    tableName: 'shop_vip_level',
    timestamps: false,
    underscored: false,
  });

  ShopVipLevel.associate = () => {
    app.model.ShopVipLevel.belongsTo(app.model.Shop, { foreignKey: 'shop_id', as: 'shop' });
  };

  return ShopVipLevel;
};
