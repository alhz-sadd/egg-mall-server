'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DATE, TEXT, DECIMAL, INTEGER } = app.Sequelize;

  const ShopGoods = app.model.define(TableNames.SHOP_GOODS, {
    goods_id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键自增',
    },
    goods_name: {
      type: STRING(255),
      allowNull: false,
      comment: '商品名称',
    },
    goods_no: {
      type: STRING(64),
      allowNull: false,
      comment: '商品编码，业务唯一编码',
    },
    goods_type: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '商品类型：1普通商品，2任务商品',
    },
    category_id: {
      type: BIGINT,
      allowNull: false,
      comment: '关联 goods_category.category_id',
    },
    cover_image: {
      type: STRING(512),
      allowNull: true,
      comment: '商品主图',
    },
    images: {
      type: TEXT,
      allowNull: true,
      comment: '多张图JSON数组',
      get() {
        const val = this.getDataValue('images');
        if (val) {
          try {
            return JSON.parse(val);
          } catch (e) {
            return [];
          }
        }
        return [];
      },
      set(val) {
        this.setDataValue('images', typeof val === 'string' ? val : JSON.stringify(val));
      },
    },
    price: {
      type: DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '商品价格',
    },
    stock: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '库存数量',
    },
    sales: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '销量',
    },
    content: {
      type: TEXT,
      allowNull: true,
      comment: '商品详情富文本',
    },
    sort: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '后台排序',
    },
    status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '0下架，1上架',
    },
    remark: {
      type: STRING(500),
      allowNull: true,
      comment: '后台备注',
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
      comment: '软删除 0正常 1删除',
    },
  }, {
    tableName: 'shop_goods',
    comment: '商品主表',
    timestamps: false,
    indexes: [
      {
        name: 'idx_category_id',
        fields: [ 'category_id', 'is_deleted' ],
      },
      {
        name: 'uk_goods_no',
        unique: true,
        fields: [ 'goods_no', 'is_deleted' ],
      },
      {
        name: 'idx_goods_type_status',
        fields: [ 'goods_type', 'status', 'is_deleted' ],
      },
      {
        name: 'idx_status',
        fields: [ 'status', 'is_deleted' ],
      },
    ],
  });

  ShopGoods.associate = () => {
    app.model.ShopGoods.belongsTo(app.model.SysUser, { foreignKey: 'create_user_id', as: 'creator' });
    app.model.ShopGoods.belongsTo(app.model.SysUser, { foreignKey: 'update_user_id', as: 'updater' });
    // TODO: app.model.GoodsCategory needs to be renamed to shop_goods_category?
    // temporarily disable category association since goods_category model was deleted
    // app.model.ShopGoods.belongsTo(app.model.GoodsCategory, { foreignKey: 'category_id', as: 'category' });
  };

  return ShopGoods;
};
