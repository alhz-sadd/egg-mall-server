'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DATE, INTEGER } = app.Sequelize;

  const ShopPayChannel = app.model.define(TableNames.SHOP_PAY_CHANNEL, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    shop_id: {
      type: BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: '归属店铺ID。0代表A端设置的全局模板',
    },
    channel_type: {
      type: TINYINT,
      allowNull: false,
      comment: '渠道类型',
    },
    channel_code: {
      type: STRING(64),
      allowNull: false,
      comment: '渠道代码',
    },
    channel_name: {
      type: STRING(128),
      allowNull: false,
      comment: '渠道名称',
    },
    is_platform_default: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '是否平台默认',
    },
    is_enable: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '是否启用',
    },
    sort: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    remark: {
      type: STRING(500),
      allowNull: true,
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
    tableName: 'shop_pay_channel',
    timestamps: false,
    underscored: false,
  });

  ShopPayChannel.associate = () => {
    app.model.ShopPayChannel.belongsTo(app.model.Shop, { foreignKey: 'shop_id', as: 'shop' });
  };

  return ShopPayChannel;
};
