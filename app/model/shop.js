'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DATE } = app.Sequelize;

  const Shop = app.model.define(TableNames.SHOP, {
    shop_id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键 自增',
    },
    shop_name: {
      type: STRING(128),
      allowNull: false,
      comment: '店铺名称，必填',
    },
    shop_no: {
      type: STRING(64),
      allowNull: false,
      comment: '店铺业务编号，唯一编码，如 SH20260905001',
    },
    contact_person: {
      type: STRING(64),
      allowNull: true,
      comment: '店铺联系人',
    },
    contact_phone: {
      type: STRING(20),
      allowNull: true,
      comment: '店铺联系电话',
    },
    province: {
      type: STRING(32),
      allowNull: true,
      comment: '省份',
    },
    city: {
      type: STRING(32),
      allowNull: true,
      comment: '城市',
    },
    district: {
      type: STRING(32),
      allowNull: true,
      comment: '区县',
    },
    address: {
      type: STRING(255),
      allowNull: true,
      comment: '详细地址',
    },
    logo: {
      type: STRING(255),
      allowNull: true,
      comment: '店铺logo地址，可为null',
    },
    business_scope: {
      type: STRING(500),
      allowNull: true,
      comment: '经营范围，可为null',
    },
    expire_time: {
      type: DATE,
      allowNull: true,
      comment: '服务到期时间；null=永久有效',
    },
    status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '店铺状态：0禁用，1启用',
    },
    settlement_type: {
      type: TINYINT,
      allowNull: true,
      comment: '结算类型，业务用，可为null',
    },
    remark: {
      type: STRING(500),
      allowNull: true,
      comment: '备注',
    },
    create_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '创建人user_id（平台管理员sys_user.user_id）',
    },
    update_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '修改人user_id',
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
    tableName: 'shop',
    comment: '店铺业务表',
    timestamps: false,
    underscored: false,
    indexes: [
      {
        unique: true,
        name: 'uk_shop_no',
        fields: [ 'shop_no', 'is_deleted' ],
      },
      {
        name: 'idx_status',
        fields: [ 'status', 'is_deleted' ],
      },
      {
        name: 'idx_contact_phone',
        fields: [ 'contact_phone', 'is_deleted' ],
      },
    ],
  });

  Shop.associate = () => {
    app.model.Shop.hasMany(app.model.SysUser, { foreignKey: 'shop_id', as: 'users' });
    app.model.Shop.hasOne(app.model.ShopConfig, { foreignKey: 'shop_id', as: 'config' });
    app.model.Shop.hasMany(app.model.ShopVipLevel, { foreignKey: 'shop_id', as: 'vips' });
  };

  return Shop;
};
