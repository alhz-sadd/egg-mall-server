'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DATE, TEXT, DECIMAL } = app.Sequelize;

  const GoodsTask = app.model.define(TableNames.GOODS_TASK, {
    id: {
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
    goods_price: {
      type: DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '商品价格',
    },
    goods_images: {
      type: TEXT,
      allowNull: true,
      comment: '多张图JSON数组',
      get() {
        const val = this.getDataValue('goods_images');
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
        this.setDataValue('goods_images', typeof val === 'string' ? val : JSON.stringify(val));
      },
    },
    status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '0下架/禁用，1上架/启用',
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
    tableName: 'goods_task',
    comment: '任务商品表',
    timestamps: false,
    indexes: [
      {
        name: 'idx_status',
        fields: [ 'status', 'is_deleted' ],
      },
    ],
  });

  return GoodsTask;
};
